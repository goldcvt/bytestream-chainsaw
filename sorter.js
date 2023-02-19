/**
 * Комменты в основном на английском, потому что
 * 1. Это стандарт
 * 2. Лень переключать раскладку
 * Все шаги могу пояснить на собесе, если нужно
 */
const { pipeline } = require("node:stream/promises");
const { createInterface } = require("node:readline");
const fs = require("fs");
const readline = require("readline");
const { Writable, Readable } = require("stream");
const { promisify } = require("util");

/**
 * A sorting predicate. Compatible with .sort method
 * You can any other one
 * @param {string} leftString
 * @param {string} rightString
 * @returns {number}
 */
const shouldSwap = (leftString, rightString) =>
  leftString.length - rightString.length;

/**
 * This is a beautiful way of merging several streams into one async iterator,
 * that is easy to consume (see sort function)
 * @param {ReadableStream[]} readables
 */
async function* concatStreams(readables) {
  for (const readable of readables) {
    for await (const chunk of readable) {
      yield chunk;
    }
  }
}

// I get bored of writing JSDoc. Plain comments ahead
const getLineSize = (line) => Buffer.from(line).length;
const getLinesSizeFormArray = (lines) =>
  lines
    .map((line) => Buffer.from(line).length)
    .reduce((prev, curr) => curr + prev, 0);

const mergeChunks = async (chunkPaths, outputFilePath) => {
  const writeStream = fs.createWriteStream(outputFilePath);
  // change to readline
  // 1. create read streams for all the chunks, merge them into one stream
  // many streams => async iterator => one stream
  const iterable = concatStreams(chunkPaths.map((f) => fs.createReadStream(f)));
  const mergedStream = Readable.from(iterable);
  // basically, we're gonna do like a merge sort
  const mergeArray = [];

  // sure, it's not ideal. it assumes we can hold Nchunks * avgLineSize in memory
  for await (const line of mergedStream) {
    // 2. take 1 line from every read stream
    if (mergeArray.length > chunkPaths.length) {
      // 3. sort them
      mergeArray.sort(shouldSwap);
      // 4. write them
      for (const sortedLine of mergeArray) {
        writeStream.write(sortedLine);
      }
      mergeArray.splice(0);
    }
    mergeArray.push(line);
  }
  // all streams are drained by now
  writeStream.end();
};

// TODO fix it
const sort = ({
  filePath,
  tempDir,
  tempPrefix,
  outputFilePath,
  chunkSize,
  maxMemory,
  maxChunkSize,
}) => {
  const readStream = fs.createReadStream(filePath, {
    highWaterMark: chunkSize,
  });
  const lineReader = readline.createInterface({
    input: readStream,
  });

  let chunkIndex = 0;
  let linesSize = 0;
  let lines = [];
  let chunks = [];
  lineReader.on("line", (line) => {
    const trimmed = line.trim();
    if (trimmed) {
      lines.push(trimmed);
      linesSize += getLineSize(trimmed);

      if (linesSize >= maxChunkSize) {
        // Sort the lines and write them to a temporary file
        const sortedLines = lines.sort(shouldSwap);
        const tempFilePath = `${tempDir}/${tempPrefix}${chunkIndex}.tmp`;
        const writeStream = fs.createWriteStream(tempFilePath);
        writeStream.on("finish", () => {
          chunks.push(tempFilePath);
          fs.unlink(tempFilePath, () => {});
        });
        for (const line of sortedLines) {
          writeStream.write(line + "\n");
        }
        writeStream.end();
        // Reset the array of lines and its' size
        linesSize = 0;
        lines = [];
        chunkIndex++;
      }
    }
  });

  lineReader.on("close", () => {
    // we have code duplication, whatever
    if (lines.length > 0) {
      // Sort the remaining lines and write them to a temporary file
      // This is the last chunk, a bit smaller than the previous ones
      const sortedLines = lines.sort(shouldSwap);
      const tempFilePath = `${tempDir}/${tempPrefix}${chunkIndex}.tmp`;
      const writeStream = fs.createWriteStream(tempFilePath);
      writeStream.on("finish", () => {
        chunks.push(tempFilePath);
        fs.unlink(tempFilePath, () => {});
        // Merge the sorted chunks
        mergeChunks(chunks);
      });
      for (const line of sortedLines) {
        writeStream.write(line + "\n");
      }
      writeStream.end();
    } else {
      mergeChunks(chunks);
    }
  });
};

module.exports = {
  shouldSwap,
  sort,
};
