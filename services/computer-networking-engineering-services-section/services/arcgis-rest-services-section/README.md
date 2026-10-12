# ArcGIS REST services section

The ArcGIS REST query protocol, as used by county and city GIS servers and
ArcGIS Hub open-data sites: count the features matching a `where` clause and
read their attributes page by page (`resultOffset` / `resultRecordCount`),
without geometry unless asked.

```js
import { countFeatures, queryFeatures } from "@red-cup-engineering/arcgis-rest-services-section/client";

const layer = "https://gis.stlouiscountymn.gov/server2/rest/services/GeneralUse/Open_Data/MapServer/7";
await countFeatures(layer, { where: "TWPCITY='010'" });
for await (const row of queryFeatures(layer, { where: "TWPCITY='010' AND BUILDING=0", outFields: ["PRCL_NBR", "OWNAME"] })) { ... }
```

`fetch` is injectable (`opts.fetch`) for tests and for hosts that route
network access through their own policy.
