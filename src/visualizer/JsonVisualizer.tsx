// src/components/JsonVisualizer.tsx
import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { List, ListRowProps } from "react-virtualized";
import classNames from "classnames";
import { JsonNode } from "./types";
import "./JsonVisualizer.css";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/solid"; //

const JsonVisualizer: React.FC = () => {
  const [jsonData, setJsonData] = useState<any>(null);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [jsonInput, setJsonInput] = useState<string>("");
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [containerHeight, setContainerHeight] = useState<number>(0);
  const [isHeaderExpanded, setIsHeaderExpanded] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const toggleHeader = (expanded?: boolean) => {
    setIsHeaderExpanded(expanded ?? !isHeaderExpanded);
  };

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    type: "key" | "value";
    content: string;
    fullPath?: string; // Add this property
    visible: boolean;
  }>({
    x: 0,
    y: 0,
    type: "key",
    content: "",
    fullPath: undefined,
    visible: false,
  });

  useEffect(() => {
    const handleClick = () => {
      setContextMenu((prev) => ({ ...prev, visible: false }));
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
        // Calculate available height by subtracting header height from viewport height
        const headerElement =
          containerRef.current.querySelector(".header-section");
        const headerHeight = headerElement?.getBoundingClientRect().height || 0;
        const availableHeight =
          window.innerHeight -
          containerRef.current.offsetTop -
          headerHeight -
          100;
        setContainerHeight(availableHeight);
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, [isHeaderExpanded]);

  const handleContextMenuClick = (content: string) => {
    navigator.clipboard.writeText(content);
    setContextMenu((prev) => ({ ...prev, visible: false }));
  };

  // Handle container resizing
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };

    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  const setSearchFocus = () => {
    setTimeout(() => {
      searchRef.current?.focus();
    }, 300);
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;

      const text = await file.text();
      const parsed = JSON.parse(text);
      setJsonData(parsed);
      setJsonInput(text);
      setError(null);
      toggleHeader(false);
      setSearchFocus();
    } catch (err) {
      setError("Invalid JSON file");
      setJsonData(null);
    }
  };

  const handleJsonInput = useCallback((text: string) => {
    try {
      if (!text.trim()) {
        setJsonData(null);
        setError(null);
        return;
      }

      const parsed = JSON.parse(text);
      setJsonData(parsed);
      setError(null);
      toggleHeader(false);
      setSearchFocus();
    } catch (err) {
      setError("Invalid JSON format");
      setJsonData(null);
    }
  }, []);

  const togglePath = useCallback((path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  const flattenJSON = useCallback(
    (
      obj: any,
      path: string = "",
      result: JsonNode[] = [],
      level: number = 0,
      relevantPaths: Set<string> = new Set()
    ): JsonNode[] => {
      if (typeof obj !== "object" || obj === null) {
        if (!searchTerm || relevantPaths.has(path)) {
          result.push({ path, value: obj, level });
        }
        return result;
      }

      // Only add this object node if it's relevant or we're not searching
      if (!searchTerm || relevantPaths.has(path)) {
        result.push({ path, value: obj, level, isExpandable: true });
      }

      if (expandedPaths.has(path) || !!searchTerm) {
        Object.entries(obj).forEach(([key, value]) => {
          const newPath = path ? `${path}.${key}` : key;
          // Only recurse if this path is relevant or we're not searching
          if (!searchTerm || relevantPaths.has(newPath)) {
            flattenJSON(value, newPath, result, level + 1, relevantPaths);
          }
        });
      }

      return result;
    },
    [expandedPaths, searchTerm]
  );

  const filteredAndFlattenedData = useMemo(() => {
    if (!jsonData) return [];

    if (!searchTerm) {
      return flattenJSON(jsonData);
    }

    const regex = new RegExp(searchTerm, "img");

    // First pass: find all matching paths and their parents
    const relevantPaths = new Set<string>();

    const findMatchingPaths = (obj: any, path: string = "") => {
      // Check if current node matches
      const matches = regex.test(path) || regex.test(String(obj));

      if (matches) {
        // Add this path and all its parent paths
        let currentPath = "";
        path.split(".").forEach((part) => {
          currentPath = currentPath ? `${currentPath}.${part}` : part;
          relevantPaths.add(currentPath);
        });
      }

      // Recurse through object properties
      if (typeof obj === "object" && obj !== null) {
        Object.entries(obj).forEach(([key, value]) => {
          const newPath = path ? `${path}.${key}` : key;
          findMatchingPaths(value, newPath);
        });
      }
    };

    findMatchingPaths(jsonData);

    // Second pass: flatten only the relevant paths
    return flattenJSON(jsonData, "", [], 0, relevantPaths);
  }, [jsonData, flattenJSON, searchTerm]);

  const renderRow = useCallback(
    ({ index, style }: ListRowProps) => {
      const item = filteredAndFlattenedData[index];
      const indent = item.level * 20;
      const key = item.path.split(".").pop() || "";

      const handleContextMenu = (
        e: React.MouseEvent,
        type: "key" | "value",
        content: string,
        fullPath?: string // Add this parameter
      ) => {
        e.preventDefault();
        setContextMenu({
          x: e.clientX,
          y: e.clientY,
          type,
          content,
          fullPath, // Add this property
          visible: true,
        });
      };

      return (
        <div
          key={item.path}
          className={classNames("json-row", {
            "json-row-expandable": item.isExpandable,
            "json-row-expanded": expandedPaths.has(item.path),
          })}
          style={{ ...style, paddingLeft: indent }}
          onClick={() => item.isExpandable && togglePath(item.path)}
        >
          <span
            className="json-key"
            onContextMenu={(e) => handleContextMenu(e, "key", key, item.path)}
            title={item.path}
          >
            {key}:
          </span>
          <span
            className="json-value truncate"
            onContextMenu={(e) =>
              handleContextMenu(
                e,
                "value",
                item.isExpandable
                  ? JSON.stringify(item.value)
                  : String(item.value)
              )
            }
            title={item.isExpandable ? "" : String(item.value).trim()}
          >
            {item.isExpandable
              ? `${Array.isArray(item.value) ? "[]" : "{}"} ${
                  Object.keys(item.value).length
                } items`
              : String(item.value)}
          </span>
        </div>
      );
    },
    [filteredAndFlattenedData, expandedPaths, togglePath]
  );

  return (
    <div
      className="json-visualizer w-full flex-1 flex flex-col"
      ref={containerRef}
    >
      <div className="header-section border-b mb-4">
        <div
          className="flex items-center cursor-pointer p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
          onClick={() => toggleHeader()}
        >
          {isHeaderExpanded ? (
            <ChevronUpIcon className="w-5 h-5 mr-2" />
          ) : (
            <ChevronDownIcon className="w-5 h-5 mr-2" />
          )}
          <span className="font-medium">JSON Input Options</span>
        </div>

        {/* Collapsible content */}
        {isHeaderExpanded && (
          <div className="toolbar flex flex-col gap-2 p-4">
            <div className="flex flex-row gap-2">
              <div>
                <label htmlFor="file" className="file-label">
                  File
                </label>
                <input
                  id="file"
                  name="file"
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="file-input max-h-10"
                />
              </div>
              <textarea
                placeholder="Or paste JSON here..."
                value={jsonInput}
                onChange={(e) => {
                  setJsonInput(e.target.value);
                  handleJsonInput(e.target.value);
                }}
                className="json-input w-full h-32 p-2 border rounded"
              />
            </div>
          </div>
        )}
      </div>

      {error && <div className="error text-red-500 mb-4">{error}</div>}

      {jsonData && (
        <>
          <div>
            <input
              ref={searchRef}
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input flex-1 w-full mb-2"
            />
          </div>
          <div className="list-container w-full flex-1 overflow-x-hidden overflow-y-hidden">
            <List
              width={containerWidth || 100}
              height={containerHeight || 600}
              rowCount={filteredAndFlattenedData.length}
              rowHeight={30}
              rowRenderer={renderRow}
              overscanRowCount={10}
            />
          </div>
        </>
      )}

      {/* Context Menu */}
      {contextMenu.visible && (
        <div
          className="context-menu"
          style={{
            position: "fixed",
            top: contextMenu.y,
            left: contextMenu.x,
            zIndex: 1000,
          }}
        >
          <div
            className="context-menu-item"
            onClick={() => handleContextMenuClick(contextMenu.content)}
          >
            Copy {contextMenu.type}
          </div>
          {contextMenu.type === "key" && contextMenu.fullPath && (
            <div
              className="context-menu-item"
              onClick={() => handleContextMenuClick(contextMenu.fullPath!)}
            >
              Copy JSON path
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default JsonVisualizer;
