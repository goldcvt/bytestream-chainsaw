const fs = require("fs");
const readline = require("readline");
const { Writable } = require("stream");
const { promisify } = require("util");

const filePath = "path/to/your/file";
const tempDir = "path/to/temp/dir";
const tempPrefix = "temp-file-";
// TODO: fix output file dest
const outputFilePath = "/output";

const chunkSize = 1024 * 1024;
const maxMemory = 500 * 1024 * 1024;
const maxChunkSize = Math.floor(maxMemory / 2);

const readStream = fs.createReadStream(filePath, { highWaterMark: chunkSize });
const lineReader = readline.createInterface({
  input: readStream,
});

let chunkIndex = 0;
let linesSize = 0;
let lines = [];
let chunks = [];

// a more civilised way instead of global variable linesSize
const getLinesSize = (lines) =>
  lines
    .map((line) => Buffer.from(string).length)
    .reduce((prev, curr) => prev + curr, 0);

lineReader.on("line", (line) => {
  const trimmed = line.trim();
  if (trimmed) {
    lines.push(trimmed);
    linesSize += Buffer.from(trimmed).length;

    if (linesSize >= maxChunkSize) {
      // Sort the lines and write them to a temporary file
      const sortedLines = lines.sort((a, b) => a.length - b.length);
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
    const sortedLines = lines.sort((a, b) => a.length - b.length);
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

const mergeChunks = (chunkPaths) => {
  // base case for recursion
  if (chunkPaths.length === 1) {
    // Rename the final sorted chunk to the output file name
    const sortedPath = chunkPaths[0];
    fs.rename(sortedPath, outputFilePath, (err) => {
      if (err) {
        console.error(
          `Error renaming ${sortedPath} to ${outputFilePath}: ${err}`
        );
      } else {
        console.log(`Sorted file written to ${outputFilePath}`);
      }
    });
    return;
  }
  const tempPrefix = "temp-sort-";
  const tempDir = os.tmpdir();
  const writers = chunkPaths.map((chunkPath) => {
    const reader = readline.createInterface({
      input: fs.createReadStream(chunkPath),
    });
    const writer = fs.createWriteStream(
      `${tempDir}/${tempPrefix}sorted-${chunkPaths.length}-${writers.length}.tmp`,
      {
        encoding: "utf-8",
      }
    );
    const lines = [];
    reader.on("line", (line) => {
      lines.push(line);
    });
    reader.on("close", () => {
      lines.sort((a, b) => a.length - b.length);
      for (const line of lines) {
        writer.write(line + "\n");
      }
      writer.end();
    });
    return writer;
  });
  if (writers.length === 2) {
    const writeStream = fs.createWriteStream(outputFilePath);
    // Merge two chunks directly into the output file
    const mergedWriter = new Writable({
      write(chunk, encoding, callback) {
        writeStream.write(chunk, encoding, callback);
      },
    });
    let [writer1, writer2] = writers;
    writer1.pipe(mergedWriter, { end: false });
    writer2.pipe(mergedWriter, { end: false });
    writer1.on("end", () => {
      writer2.end();
    });
    writer2.on("end", () => {
      mergedWriter.end();
    });
  } else {
    // Merge multiple chunks recursively
    const chunksPerMerge = Math.floor(Math.sqrt(writers.length));
    const groups = [];
    for (let i = 0; i < writers.length; i += chunksPerMerge) {
      const group = writers.slice(i, i + chunksPerMerge);
      groups.push(group);
    }
    const mergePromises = groups.map((group, index) => {
      return new Promise((resolve, reject) => {
        const mergedPath = `${tempDir}/${tempPrefix}merged-${chunkPaths.length}-${index}.tmp`;
        const mergedWriter = new Writable({
          write(chunk, encoding, callback) {
            writeStream.write(chunk, encoding, callback);
          },
        });
        let [writer1, writer2] = group;
        writer1.pipe(mergedWriter, { end: false });
        writer2.pipe(mergedWriter, { end: false });
        writer1.on("end", () => {
          writer2.end();
        });
        writer2.on("end", () => {
          mergedWriter.end(() => {
            resolve(mergedPath);
          });
        });
      });
    });
    Promise.all(mergePromises).then((mergedPaths) => {
      // Recursively merge the merged chunks
      mergeChunks(mergedPaths);
    });
  }
};
