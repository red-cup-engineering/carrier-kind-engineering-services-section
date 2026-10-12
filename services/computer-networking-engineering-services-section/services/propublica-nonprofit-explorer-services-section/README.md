# ProPublica Nonprofit Explorer Services Section

ProPublica's Nonprofit Explorer API (`projects.propublica.org/nonprofits/api`): the IRS
exempt-organization list, searchable by name or keyword, with each organization's mailing
address, NTEE code and latest financials by EIN. Public, keyless, JSON.

- `src/client.mjs`: `searchOrganizations`/`searchOrganizationsAll` and `getOrganization`.

Used to find real nonprofit buyer and partner organizations in a market by what they are named
and classified as, not to file anything on their behalf.
