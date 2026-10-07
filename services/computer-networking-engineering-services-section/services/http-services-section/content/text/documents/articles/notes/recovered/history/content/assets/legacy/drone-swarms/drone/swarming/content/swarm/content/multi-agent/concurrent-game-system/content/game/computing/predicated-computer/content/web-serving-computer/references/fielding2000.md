---
type: reference
class: academic
status: cited
authors: [Fielding, Roy Thomas]
year: 2000
title: "Architectural Styles and the Design of Network-based Software Architectures"
venue: "Doctoral dissertation, University of California, Irvine"
---

## Source

R. T. Fielding. *Architectural Styles and the Design of Network-based Software Architectures*. Ph.D. dissertation, University of California, Irvine, 2000. https://www.ics.uci.edu/~fielding/pubs/dissertation/top.htm

## Form

Doctoral dissertation. The work that introduced *Representational State Transfer* (REST) as an architectural style and gave the web a self-conscious set of design principles to test itself against. Companion to (and partial justification for) the HTTP/1.1 design.

## Content summary

Develops the methodology of *architectural styles* — named, parameterized constraint sets that describe a class of system architectures by what they prohibit rather than what they prescribe. Surveys the existing styles for network-based software (client-server, layered, pipe-and-filter, mobile code, etc.) and characterizes their tradeoffs. Introduces REST as a derived style obtained by composing constraints (client-server, stateless, cacheable, uniform interface, layered, code-on-demand) with the goal of optimizing for performance, scalability, generality, simplicity, modifiability, visibility, portability, and reliability of large-scale distributed hypermedia systems. The *uniform interface* constraint is REST's defining contribution and decomposes into four sub-constraints: identification of resources (URIs), manipulation of resources through representations, self-descriptive messages, and hypermedia as the engine of application state (HATEOAS). Validates the design retroactively by showing how HTTP/1.1 and URI specifications instantiate REST. Closes with a discussion of where the early web departed from REST (e.g., cookies as out-of-band session state) and what that cost in scalability and visibility.
