const { Writable, Readable } = require("stream");

const runTestCase = (description, testingCallback) {
  console.log(description);
  testingCallback();
}

const fakeChunkStreamFactory = (lines) =>
  Readable.from(
    (async function* gen() {
      for (const line of lines) yield line;
    })()
  );

module.exports = {
  fakeChunkStreamFactory,
  runTestCase
};
