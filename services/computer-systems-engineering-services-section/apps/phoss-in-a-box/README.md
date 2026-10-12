---
title: "PhOSS-in-a-Box"
type: text
keywords:
  - Philosophy
  - OpenSource
  - ProjectBoilerplate
description: "A set of files for initializing a philosophically open-source project."
target-discipline: technology
triage-enriched-by: "infer-triage-frontmatter-v2-by-qwen2.5:7b"
date-triage-enriched: 2026-03-08T20:43:21
---

_Boilerplate for initializing a philosophically open-source project._

**PhOSS-in-a-Box** is a set of files you can download to have everything you 
need to start a
[philosophically open-source project](https://emsenn.gitlab.io/docs/phoss/):
a project that is open not just to download and modification, but 
collaboration.

> _**WARNING**_: PhOSS-in-a-Box is currently in alpha and probably 
shouldn't be used.

Here's an overview of what this repo contains:
```
your-project
│
└─ CHANGELOG . . . . . # A record, for humans by humans, of the project's 
│                      # changes, split up by release.
│
│
└─ CODE_OF_CONDUCT . . # Guidelines for behavior all contributors and
│                      # maintainers must follow.
│
│
└─ CONTRIBUTING.md . . # Manual for the contribution process.
│
│
└─ LICENSE . . . . . . # Instructions to go look at the UNLICENSE
│
│
└─ MAINTENANCE.md . . .# Manual for maintaining this project.
│
│
└─ README.md . . . . . # An overview of the project written for prospective 
│                      # users.
│
│
└─ TODO.md  . . . . . .# A record of the tasks that should be done, as 
│                      # decided by the project's maintainer under the
│                      # guidelines in MAINTENANCE.md
│
│
└─ UNLICENSE . . . . . # The project's license, which makes it very 
                         open-sourced.
```


## Project Governance
This project is currently maintained by [emsenn](https://emsenn.gitlab.io), 
who will operate it under the terms in [MAINTENANCE.md](MAINTENANCE.md).

Contributions are welcome under the guidelines in 
[CONTRIBUTING.md](CONTRIBUTING.md), but all contributors must adhere to 
the [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## Language
This project is developed in English, and at the moment, all contributions 
should also be in English. However, I would love to have this boilerplate 
available in other languages.

## Project History
This project was started because I ([emsenn](https://emsenn.gitlab.io)) was 
tired of needing to assemble the same boilerplate for all my projects - or 
worse, missing a part of something I wanted in my project. So, I made this 
repo to have something I can easily clone.


## Installation
As this is pre-release, the best way to get the boilelrplate is with `git`.

```shell
git clone https://gitlab.com/emsenn/phoss-in-a-box.git 
mv phoss-in-a-box your-project
cd your-project
rm -r .git
```

Of course, [PhOSS](https://emsenn.gitlab.io/docs/phoss/) is more than just 
a few files you keep in your repo. It requires a conscious effort to adhere 
to the definition: you, as the project maintainer, must follow the 
guidelines in MAINTENANCE.md, and make sure the culture of the project is 
truly open to collaboration. There's no shell command for that, or way to 
add it to your CI/CD process. "Installing" PhOSS-in-a-Box is more about 
the human effort.

## Contributing
This project is open to contributions. For complete instructions on how to 
do so, see [CONTRIBUTING.md](CONTRIBUTING.md).

For a list of things to be done, see [TODO.md](TODO.md).

## Financing
This is a personal project that at the moment has no costs and requires 
no funding. Donations to this project's maintainer may be made at:
- https://ko-fi.com/emsenn/
- https://en.liberapay.com/emsenn/

## Versioning
This project adheres to [Semantic versioning](http://semver.org/) 
conventions.

## License
This project uses the UNLICENSE, as it is the most freeing that is still 
likely to be enforceable.

## Credits
- This project is maintained by [emsenn](https://emsenn.gitlab.io).
- This project relies heavily on work from the following people:
  - [Coraline Ada Ehmke](https://where.coraline.codes/) who created 
    the [Contributor's Covenant](https://www.contributor-covenant.org/).
  - [Olivier Lacan](https://olivierlacan.com/) who created 
    [keepachangelog.com](htttps://keepachangelog.com).
  - [David Larlet](https://github.com/davidbgk/) who influenced this 
    README.
  - (Tom Preston-Werner)[http://tom.preston-werner.com/] who created 
    [semver.org](https://semver.org)
  - [Shaloo Shalini](https://github.com/shaloo/) who also influenced 
    the README.
  - Mozilla Science, whose guide to 
    [writing a CONTRIBUTING.md](https://mozillascience.github.io/working-open-workshop/contributing/)
    heavily influenced this projects.