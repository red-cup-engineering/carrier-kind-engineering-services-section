import { startLocalWitnessJournalProviderProcess } from "@red-cup-engineering/witness-journal-document-service/local-provider";
import { createServer } from "./server.mjs";

// The local witness journal keeps what it witnesses (settlement witnesses among them) under WITNESS_JOURNAL_ROOT.
if (!process.env.WITNESS_JOURNAL_ROOT) throw new Error("WITNESS_JOURNAL_ROOT is required: the directory where the local witness journal keeps what it witnesses");
const witnessJournal = await startLocalWitnessJournalProviderProcess({ root: process.env.WITNESS_JOURNAL_ROOT, port: Number(process.env.WITNESS_JOURNAL_LOCAL_PORT ?? 19764) });
const env = { ...process.env, WITNESS_JOURNAL_RDF_AGENT: witnessJournal.agentCardUrl };
const { app, network, facilitatorUrl, payTo, price, port } = createServer(env);
const server = app.listen(port, "0.0.0.0", () => console.log(JSON.stringify({
  event: "trashpanda-services-ready",
  brand: "Trashpanda Services",
  port,
  network,
  facilitatorUrl,
  payTo,
  price,
  witnessJournalAgent: witnessJournal.agentCardUrl,
})));

async function stop(signal) {
  console.log(JSON.stringify({ event: "trashpanda-services-stopping", signal }));
  await new Promise((accept) => server.close(accept));
  await witnessJournal.close();
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => {
    stop(signal).then(() => process.exit(0), (error) => {
      console.error(error);
      process.exit(1);
    });
  });
}
