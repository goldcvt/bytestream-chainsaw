/**
 * This file contains my first idea for sorting
 * Just so you can see what I've iterated from (yup, there's git. But whatever)
 */

// the idea was to recursively call bubbleUpOneStringInChunk, firstly on
// readable stream from readline, then use streams opened on destFile to rewrite it
// So it's basically bubbleSort on streams. Problem is we have a 10Tb file
// which means A LOT of strings
// so yup, I dropped this idea
/**
 * Does a bubble sort on a sourceStream, resulting
 * in a destStream with one line in its' place
 * @param {(string, string) => number} sortingPredicate
 * @param {ReadableStream} sourceStream
 * @param {WritableStream} destinationStream
 * @returns {Promise<void>}
 */
const bubbleUpOneStringInChunk = async (
  sortingPredicate,
  sourceStream,
  destinationStream
) => {
  const lineIterator = createInterface({
    input: sourceStream,
  });
  let prevLine = "";
  for await (const line of lineIterator) {
    // will check another pair if should not sort this one
    if (sortingPredicate(prevLine, line) <= 0) {
      prevLine = line;
      // I didn't use "continue" here as I'm not sure how would it behave with asyncIterator
      // made from stream
    } else {
      // write current line to destination stream if it is less than prevLine
      // prevLine (left line) stays to be the same line, it will "bubble up" virtually
      destinationStream.getWriter().write(line + "\n");
    }
  }
};
