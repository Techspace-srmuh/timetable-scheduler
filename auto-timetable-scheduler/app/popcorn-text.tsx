"use client";

import * as React from "react";

type HeadingTag = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

type PopcornTextProps = {
  as: HeadingTag;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
};

function getAccessibleText(node: React.ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(getAccessibleText).join("");
  if (!React.isValidElement<{ children?: React.ReactNode }>(node)) return "";
  if (node.type === "br") return "\n";
  return getAccessibleText(node.props.children);
}

function animateCharacters(node: React.ReactNode, keyPrefix = "char"): React.ReactNode {
  if (typeof node === "string" || typeof node === "number") {
    return Array.from(String(node)).map((character, index) => (
      <span
        aria-hidden="true"
        className={character === " " ? "popcorn-space" : "popcorn-char"}
        key={`${keyPrefix}-${index}`}
        style={{
          "--char-index": index,
          "--char-rotation": `${(index % 7 - 3) * 6}deg`,
        } as React.CSSProperties}
      >
        {character}
      </span>
    ));
  }

  if (Array.isArray(node)) {
    return node.map((child, index) => animateCharacters(child, `${keyPrefix}-${index}`));
  }

  if (React.isValidElement<{ children?: React.ReactNode }>(node) && node.type !== "br") {
    return React.cloneElement(node, {
      ...node.props,
      children: animateCharacters(node.props.children, keyPrefix),
    });
  }

  return node;
}

export default function PopcornText({ as: Tag, className, style, children }: PopcornTextProps) {
  return (
    <Tag className={`popcorn-heading${className ? ` ${className}` : ""}`} style={style} aria-label={getAccessibleText(children)}>
      {animateCharacters(children)}
    </Tag>
  );
}
