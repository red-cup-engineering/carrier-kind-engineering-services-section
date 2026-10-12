# SSRS report services section

SQL Server Reporting Services, as county and city governments publish reports
through the ReportViewer web page. Opening the page starts a report session (a
session cookie and a session id inside the page's export URL); `exportReport`
opens the page and asks that session for the report in a data format, CSV by
default, so a caller gets the report's rows instead of its HTML.

```js
import { exportReport } from "@red-cup-engineering/ssrs-report-services-section/client";

const { text } = await exportReport("http://reports.stlouiscountymn.gov/ssrswrapper/ShowSSRSReport.aspx?reportVersion=2016PBIP&reportPath=/Land/LandSystem/ShowAvailable_LandSale_Table&param1=saleType=2&param2=saleDate=2026-04-08");
```

`fetch` is injectable (`opts.fetch`) for tests and for hosts that route
network access through their own policy.
