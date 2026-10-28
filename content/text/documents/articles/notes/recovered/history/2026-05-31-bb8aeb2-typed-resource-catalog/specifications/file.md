---
name: file
description: Normative specification for POSIX-file conformance.
status: active
---


## 1. Introduction

This document specifies conformance criteria for files. Conformance under this specification does not entail conformance under [`resource`](resource.md), [`entity`](entity.md), or [`structure`](structure.md). Each of those specifications pins separate structure put on files, and conformance under each is established independently. The is-a relations connecting this specification to those — `files-are-entities`, `entities-are-structures`, `files-are-resources` — are asserted in [`prose/learning/claims/files-are-entities-are-structures-are-resources.md`](../../../../prose/learning/claims/files-are-entities-are-structures-are-resources.md).

## 2. Conventions

The key words MUST, MUST NOT, SHOULD, SHOULD NOT, and MAY are to be interpreted as described in RFC 2119.

## 3. Terminology

**File.** A POSIX-filesystem artifact identified by a path and carrying a byte-content.

**Path.** A `/`-separated sequence of path components terminating at a filename.

**Filename.** The terminal path component.

**Byte-content.** The octet sequence the file holds at a moment in time.

## 4. Path

### 4.1

A path MUST resolve to at most one file.

### 4.2

A path MUST be a valid UTF-8 byte sequence.

### 4.3

A file MUST NOT be reachable only via symbolic-link traversal. The canonical path is the resolved real-path; symlink aliases are permitted but not load-bearing.

## 5. Filename

### 5.1

A filename MUST NOT contain the path separator `/`.

### 5.2

A filename MUST NOT contain the null byte `\0`.

### 5.3

A filename MUST NOT be empty.

### 5.4

A filename MUST NOT be `.` or `..`.

Filename-shape conventions beyond §5.1–5.4 (kebab-case stems, lowercase extensions, exemption tables) belong to [`resource`](resource.md). A filename satisfying §5 is a conformant POSIX filename; whether it is a conformant resource-slug is a separate question.

## 6. Content

A file's byte-content is unconstrained by this specification. Interpretation of byte-content as predication cells, frontmatter, markdown body, or binary payload belongs to additional structure put on the file under [`entity`](entity.md) and [`structure`](structure.md) and to specifications of particular encoding forms.

## 7. Conformance

A file is conformant *as a POSIX file* iff its path satisfies §4 and its filename satisfies §5.
