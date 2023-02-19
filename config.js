// sure thing, I'll move it to env
const filePath = "path/to/your/file";
const tempDir = "path/to/temp/dir";
const tempPrefix = "temp-file-";
const outputFilePath = "/output";
const chunkSize = 1024 * 1024;
const maxMemory = 500 * 1024 * 1024;
const maxChunkSize = Math.floor(maxMemory / 2);

module.exports = {
  defaultConfig: {
    filePath,
    tempDir,
    tempPrefix,
    outputFilePath,
    chunkSize,
    maxMemory,
    maxChunkSize,
  },
};
