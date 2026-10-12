# Serve Google OAuth Service

Composes the active atomic OAuth services into a stateful authorization server
that uses Google as its upstream identity provider.

This package owns the composition required to serve registration,
authorization, callback, token, revocation, and metadata resources. The
individual transformations remain in their existing atomic services. Sites
provide deployment policy, public origin, admitted accounts, credentials, and
the state directory.

It replaces the OAuth portion of the retired `organizing-with-the-web`
omnibus package without restoring that package.
