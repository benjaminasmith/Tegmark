var wheeler = (function() {
  const bytesPerNode = 14; // 3 floats + 2 unsigned integers.

  return {
    decode: function(arrayBuffer, world) {
      if (world.hasOwnProperty("cells")) {
        console.error("World already built!");
        return;
      }

      var start = new Date();
      var nodeSectionLength = 0, cellSectionLength = 0, colourSectionLength = 0;

      function getNode(i) {
        var integerParts = new Uint8Array(arrayBuffer, i, 2);
        var n = new Float32Array(arrayBuffer.slice(i + 2, i + 2 + 12));
        if (n[0] > 0) {
          n[0] = n[0] + integerParts[0];
        } else {
          n[0] = n[0] - integerParts[0];
        }
        if (n[1] > 0) {
          n[1] = n[1] + integerParts[1];
        } else {
          n[1] = n[1] - integerParts[1];
        }
        return n;
      }

      var node = getNode(0);
      var nodes = [node];
      var byteArray = new Uint8Array(arrayBuffer);

      for (var i = bytesPerNode; i < byteArray.length; i += bytesPerNode) {
        node = getNode(i);
        var lastNode = nodes[nodes.length - 1];
        if (
          node[0] == lastNode[0] &&
          node[1] == lastNode[1] &&
          node[2] == lastNode[2]
        ) {
          nodeSectionLength = i + bytesPerNode;
          break;
        } else {
          nodes.push(node);
        }
      }
      console.log(
        "Read " + nodes.length + " nodes from " + nodeSectionLength + " bytes"
      );

      function getColour(i) {
        return new Uint8Array(arrayBuffer, i, 3);
      }

      var colour = getColour(nodeSectionLength);
      var lastColour;
      colours = [colour];

      for (var i = nodeSectionLength + 3; i < byteArray.length; i += 3) {
        colour = getColour(i);
        lastColour = colours[colours.length - 1];
        if (
          lastColour[0] == colour[0] &&
          lastColour[1] == colour[1] &&
          lastColour[2] == colour[2]
        ) {
          colourSectionLength = i + 3 - nodeSectionLength;
          break;
        } else {
          colours.push(colour);
        }
      }

      console.log(
        "Read " +
          colours.length +
          " colours from " +
          colourSectionLength +
          " bytes"
      );

      var bytesPerNodeIndex = Math.ceil(Math.log2(nodes.length) / 8);
      var bytesPerColourIndex = Math.ceil(Math.log2(colours.length) / 8);

      console.log(
        "Expecting node indices with " +
          bytesPerNodeIndex +
          " bytes per cell index"
      );
      console.log(
        "Expecting colour indices with " +
          bytesPerColourIndex +
          " bytes per colour index"
      );

      var offset = 0, sectionLength = 0;
      var objectArray = new Uint8Array(
        arrayBuffer,
        nodeSectionLength + colourSectionLength
      );

      function getIndex(bytesPerIndex, i) {
        var index = 0;

        for (var j = 0; j < bytesPerIndex; j++) {
          var component = objectArray[i + j];
          if (j > 0) {
            component = component * Math.pow(256, j);
          }
          index += component;
        }
        return index;
      }

      function getObjects(bytesPerAnnotation, annotationName, objectName) {
        if (typeof objectName === "undefined") objectName = "objects";
        var lastIndex = -1, lastObjectIndex = -1;
        var objects = [], object = [];

        objectLoop: while (offset < objectArray.byteLength) {
          lastIndex = getIndex(bytesPerNodeIndex, offset);
          object = [lastIndex];

          indexLoop: for (
            var i = offset + bytesPerNodeIndex;
            i < objectArray.byteLength;
            i += bytesPerNodeIndex
          ) {
            index = getIndex(bytesPerNodeIndex, i);
            if (index == lastIndex) {
              if (object.length == 1) {
                var lastObject = objects[objects.length - 1];
                offset += bytesPerNodeIndex;
                if (index == lastObject[lastObject.length - 1]) {
                  break objectLoop;
                }
              } else {
                object[annotationName] = getIndex(
                  bytesPerAnnotation,
                  i + bytesPerNodeIndex
                );
                objects.push(object);
                offset = i + bytesPerNodeIndex + bytesPerAnnotation;
                break indexLoop;
              }
            } else {
              object.push(index);
              lastIndex = object[object.length - 1];
            }
          }
        }
        console.log("Read " + objects.length + " " + objectName);
        return objects;
      }
      var cells = getObjects(bytesPerColourIndex, "colour", "cells");
      var paths = getObjects(1, "type", "paths");

      world.nodes = nodes;
      world.cells = cells;
      world.paths = paths;
      world.colours = colours;

      var end = new Date();
      console.log("Parse time: " + (end - start) + " ms");
    }
  };
})();