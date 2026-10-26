---
name: directory
description: Normative specification for directories.
status: active
requires:
  - file.md
---


## 1. Introduction

This document specifies the conformance criteria for directories.

## 2. Conventions

The key words MUST, MUST NOT, SHOULD, SHOULD NOT, and MAY are to be interpreted as described in RFC 2119.

## 3. Terminology

**Directory.** A node in the filesystem tree containing zero or more files and other directories.

**Name.** The terminal path component of a directory's path.

**Child.** A file or directory whose parent is the given directory.

**Parent.** The directory whose immediate contents include a given child.

## 4. Path

### 4.1

A path MUST resolve to a file or a directory, but not both.

### 4.2

A path MUST be a valid UTF-8 byte sequence.

### 4.3

A directory MUST NOT be reachable only via symbolic link traversal.

## 5. Name

### 5.1

A directory name MUST match `^[a-z0-9]+(-[a-z0-9]+)*$`.

### 5.2

A directory name MUST NOT contain:

- any whitespace character
- the path separator `/`
- the null byte
- any control character in the range U+0001..U+001F or U+007F

## 6. Children

### 6.1

A directory MAY have zero children.

### 6.2

Every child MUST be conformant with its applicable specification.

## 7. Conformance

A directory is conformant iff its path satisfies §4, its name satisfies §5, and every child satisfies §6.
