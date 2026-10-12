---
title: "Guidelines for Contributing"
type: text
keywords:
  - Contributing
  - ProjectManagement
  - OpenSource
description: "Guidelines for contributing to a philosophically open-source project, including how to report issues, request features, and submit pull requests."
target-discipline: technology
triage-enriched-by: "infer-triage-frontmatter-v2-by-qwen2.5:7b"
date-triage-enriched: 2026-03-08T20:14:19
---

Thanks for taking the time to look at contributing to this project. Even 
simply letting us know about problems you run into is a big help.

All contributors, even those just letting us know about bugs, are 
expected to follow the project's [code of conduct](CODE_OF_CONDUCT.md), 
and it is recommended you read some [background](#background) information 
about the project if you have the time.

There are specific guidelines for:
- [reporting bugs](#reporting-issues)
- [requesting features](#sharing-user-stories)
- [submitting pull requests](#submitting-pull-requests)

There is also a general [development guide](#development-guide) outlining 
recommended writing styles & other conventions.

## Background Information
This is a [philosophically open-source](https://emsenn.gitlab.io/phoss/) 
project, and as such tries to create an atmosphere that encourages 
collaboration.

## Reporting Issues

## Sharing User Stories
"User Stories" are a way of sharing that you _want_ something, in a way that 
makes it helpful to whoever takes up the job of meeting that desire. They
often start like, "_As an **end-user**, I want **the buttons on the homepage 
to be easier to click**._": give some sense of who you are in relation to the
project and a description of the thing you want (or need) to do.

## Submitting Pull Requests

## Development Guide
### Git Commit Messages
- Use present tense ("Add feature" not "Added feature")
- Use imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit the first line to 72 characters or less
- The next paragraph should be a summary.
- Further paragraphs should explain the commit more fully as necessary
- Considering starting your message with an action and audience shortcode:
  - `action` represents what purpose the commit serves and is one of:
    - `chg` - You've refactored existing code, removed technical debt, or expanded test coverage
    - `fix` - You've fixed an issue. Ideally, prove the GitHub Issue # in the summary.
    - `new` - You've added new features, documentation, or test cases.
  - `audience` represents who would care about the change
    - `dev` - API revisions/additions, refactors
    - `usr` - Client experience revisions/additions
    - `pkg` - Packaging/metadata revisions/additions
    - `test` - Test case revisions/additions
    - `doc` - documentation revisions/additions