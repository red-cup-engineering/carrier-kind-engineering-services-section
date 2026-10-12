---
name: "federation"
aliases:
  - "federation"
date-created: 2025-12-31
tags: []
---

**Federation** is a model of networked communication in which independent servers exchange data with one another according to shared protocols, without any single server having authority over the whole network. Each server (often called an *instance*) operates autonomously — it sets its own policies, manages its own users, and stores its own data — but participates in a larger network by sending and receiving standardized messages.

In the context of the [fediverse](./fediverse.md), federation is implemented primarily through the [ActivityPub](../../topics/activitypub/index.md) protocol. When a user on one instance follows a user on another, the two servers establish a relationship: the remote server sends new posts to the local server, which displays them to the follower. Replies, likes, and boosts flow back through the same channel.

Federation differs from centralized platforms (where one entity controls all data and rules) and from fully peer-to-peer networks (where there are no servers at all). It occupies a middle ground: servers are sovereign over their own domain but choose to interoperate. This means that an instance administrator can block another instance entirely, severing the federation link — a capability that has no equivalent in centralized systems.

The trade-offs of federation include: uneven content availability (a post exists only on servers that have fetched it), moderation complexity (each instance must make its own moderation decisions), and eventual-consistency rather than real-time synchronization.
