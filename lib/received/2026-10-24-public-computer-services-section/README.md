# public-computer-services-section

Received 2026-10-24 from causeway-services/public-computer-services-section@d0177937fe0cec750b06338950fe9d9f00c67c81

Executable code moved here verbatim, at the same relative paths, from the section repository above
(custody rule `science-engineering-operations-parameterize-in-order`: Red Cup Engineering holds all
executable code; the section keeps its instance data).

Where code read the section's own data by relative path, that root is now a parameter
(environment variable named in the code; default is the current working directory). Run the code
with the section checkout as cwd, or set the variable to the section checkout.


Tests: `npm test` (dependencies are private/workspace packages and may not install; CI is non-blocking).
