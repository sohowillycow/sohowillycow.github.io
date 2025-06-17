(function(){
  /**
   * Minimal BufferGeometry utilities from three.js r160.
   * Currently only implements mergeVertices, which is used
   * to deduplicate vertices while respecting morph targets.
   */
  function mergeVertices(geometry, tolerance = 1e-4) {
    if (!geometry.isBufferGeometry) {
      console.error('THREE.BufferGeometryUtils: geometry is not a BufferGeometry.');
      return geometry;
    }

    tolerance = Math.max(tolerance, Number.EPSILON);

    const hashToIndex = {};
    const indices = geometry.getIndex();
    const positions = geometry.getAttribute('position');
    const vertexCount = indices ? indices.count : positions.count;
    let nextIndex = 0;

    const attributeNames = Object.keys(geometry.attributes);
    const attrArrays = {};
    const morphAttrsArrays = {};
    const newIndices = [];
    const getters = ['getX', 'getY', 'getZ', 'getW'];

    for (let i = 0, l = attributeNames.length; i < l; i++) {
      const name = attributeNames[i];
      attrArrays[name] = [];
      const morphAttr = geometry.morphAttributes[name];
      if (morphAttr) {
        morphAttrsArrays[name] = new Array(morphAttr.length).fill().map(() => []);
      }
    }

    const decimalShift = Math.log10(1 / tolerance);
    const shiftMultiplier = Math.pow(10, decimalShift);

    for (let i = 0; i < vertexCount; i++) {
      const index = indices ? indices.getX(i) : i;
      let hash = '';
      for (let j = 0, l = attributeNames.length; j < l; j++) {
        const name = attributeNames[j];
        const attribute = geometry.getAttribute(name);
        const itemSize = attribute.itemSize;
        for (let k = 0; k < itemSize; k++) {
          hash += `${~~(attribute[getters[k]](index) * shiftMultiplier)},`;
        }
      }
      if (hash in hashToIndex) {
        newIndices.push(hashToIndex[hash]);
      } else {
        for (let j = 0, l = attributeNames.length; j < l; j++) {
          const name = attributeNames[j];
          const attribute = geometry.getAttribute(name);
          const morphAttr = geometry.morphAttributes[name];
          const itemSize = attribute.itemSize;
          const newArray = attrArrays[name];
          const newMorphArrays = morphAttrsArrays[name];
          for (let k = 0; k < itemSize; k++) {
            const getterFunc = getters[k];
            newArray.push(attribute[getterFunc](index));
            if (morphAttr) {
              for (let m = 0, ml = morphAttr.length; m < ml; m++) {
                newMorphArrays[m].push(morphAttr[m][getterFunc](index));
              }
            }
          }
        }
        hashToIndex[hash] = nextIndex;
        newIndices.push(nextIndex);
        nextIndex++;
      }
    }

    const result = geometry.clone();
    for (let i = 0, l = attributeNames.length; i < l; i++) {
      const name = attributeNames[i];
      const oldAttribute = geometry.getAttribute(name);
      const buffer = new oldAttribute.array.constructor(attrArrays[name]);
      const attribute = new THREE.BufferAttribute(buffer, oldAttribute.itemSize, oldAttribute.normalized);
      result.setAttribute(name, attribute);
      if (name in morphAttrsArrays) {
        for (let j = 0; j < morphAttrsArrays[name].length; j++) {
          const oldMorphAttribute = geometry.morphAttributes[name][j];
          const buffer = new oldMorphAttribute.array.constructor(morphAttrsArrays[name][j]);
          const morphAttribute = new THREE.BufferAttribute(buffer, oldMorphAttribute.itemSize, oldMorphAttribute.normalized);
          result.morphAttributes[name][j] = morphAttribute;
        }
      }
    }
    result.setIndex(newIndices);
    return result;
  }

  if (!THREE.BufferGeometryUtils) {
    THREE.BufferGeometryUtils = {};
  }
  THREE.BufferGeometryUtils.mergeVertices = mergeVertices;
})();
