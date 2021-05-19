function RefValue(value) {
  this.val = value;
}

function Geometry() {
  this.x = 0;
  this.y = 0;
  this.z = 0;
  this.vertices = new Array();
  this.faces = new Array();
  this.colors = new Array();
  this.faceColors = new Array();
}

Geometry.prototype.GetVertexBuffer = function () {
  var buffer = new ArrayBuffer(this.vertices.length * 3 * 4);
  var floatArray = new Float32Array(buffer);

  for (var i = 0; i < this.vertices.length; i++) {
    floatArray[i * 3] = this.vertices[i].x;
    floatArray[i * 3 + 1] = this.vertices[i].y;
    floatArray[i * 3 + 2] = this.vertices[i].z;
  }

  return buffer;
};

Geometry.prototype.GetFaceBuffer = function () {
  var buffer = new ArrayBuffer(this.faces.length * 3 * 4);
  var intArray = new Int32Array(buffer);

  for (var i = 0; i < this.faces.length; i++) {
    intArray[i * 3] = this.faces[i].a;
    intArray[i * 3 + 1] = this.faces[i].b;
    intArray[i * 3 + 2] = this.faces[i].c;
  }

  return buffer;
};

Geometry.prototype.GetLightBuffer = function () {
  var buffer = new ArrayBuffer(this.faceColors.length * 2);
  var byteArray = new Int8Array(buffer);

  for (var i = 0; i < this.faceColors.length; i++) {
    byteArray[i * 2] = this.faceColors[i];
    byteArray[i * 2 + 1] = this.faceColors[i];
  }

  return buffer;
};

Geometry.prototype.GetColorBuffer = function () {
  var buffer = new ArrayBuffer(this.colors.length);
  var byteArray = new Int8Array(buffer);

  for (var i = 0; i < this.colors.length; i++) {
    byteArray[i] = this.colors[i];
  }

  return buffer;
};

function Vector3(x, y, z) {
  this.x = x;
  this.y = y;
  this.z = z;
}

function Face3(a, b, c) {
  this.a = a;
  this.b = b;
  this.c = c;
}

function VoxelChunk(noise, x, y, z, width, height, depth) {
  this.noise = noise;

  if (width % 32 != 0) width = (Math.floor(width / 32) + 1) * 32;
  if (height % 32 != 0) height = (Math.floor(height / 32) + 1) * 32;
  if (depth % 32 != 0) depth = (Math.floor(depth / 32) + 1) * 32;

  this.xBlocks = width / 32;
  this.zBlocks = depth / 32;
  this.yBlocks = height / 32;

  this.xOffset = x;
  this.yOffset = y;
  this.zOffset = z;

  this.width = width + 2;
  this.height = height + 2;
  this.depth = depth + 2;

  this.lightRadius = 16;

  this.voxels = new Int8Array(this.width * this.height * this.depth);
  this.lightVoxels = new Int8Array(
    (this.width + this.lightRadius * 2) *
      this.height *
      (this.depth + this.lightRadius * 2)
  );
}

VoxelChunk.prototype.GetLightValue = function (x, y, z) {
  var _x = x + this.lightRadius - 1;
  var _y = y;
  var _z = z + this.lightRadius - 1;

  return this.lightVoxels[
    _x +
      _y * (this.width + this.lightRadius * 2 - 2) +
      _z * (this.width + this.lightRadius * 2 - 2) * this.height
  ];
};

VoxelChunk.prototype.Octaves = [
  { amplitude: 32, xFreq: 2, yFreq: 2, zFreq: 1 },
  { amplitude: 64, xFreq: 4, yFreq: 4, zFreq: 1 },
  { amplitude: 8, xFreq: 8, yFreq: 8, zFreq: 1 },
  { amplitude: 4, xFreq: 16, yFreq: 16, zFreq: 1 },
  { amplitude: 2, xFreq: 32, yFreq: 32, zFreq: 1 },
  { amplitude: 1, xFreq: 64, yFreq: 64, zFreq: 1 },
];

VoxelChunk.prototype.CreateChunk = function () {
  var wDiv = 1 / 256;
  var hDiv = 1 / 32;
  var dDiv = 1 / 128;
  var start = new Date();
  // Use the offsets to generate the correct terrain for the chunk
  for (
    var z = this.zOffset - this.lightRadius;
    z < this.depth + this.lightRadius * 2 - 2 + this.zOffset - this.lightRadius;
    z++
  ) {
    for (var y = this.yOffset - 1; y < this.height + this.yOffset - 1; y++) {
      for (
        var x = this.xOffset - this.lightRadius;
        x <
        this.width + this.lightRadius * 2 - 2 + this.xOffset - this.lightRadius;
        x++
      ) {
        /*var warp = 8 * this.noise.NoiseOptimized(2 * x * wDiv, 2 * z * dDiv, 2 * y * hDiv);
                var newX = x + warp;
                warp = 8 * this.noise.NoiseOptimized(2 * newX * wDiv, 2 * z * dDiv, 2 * y * hDiv); //this.noise.Noise(2 * newX * wDiv, 2 * z * dDiv, 2 * y * hDiv);
                var newY = y + warp;
                var newZ = z + warp;*/
        var wPoint = this.noise.WarpPoint(x, z, y, wDiv, dDiv, hDiv, 2, 8, 2);
        var newX = wPoint[0];
        var newY = wPoint[2];
        var newZ = wPoint[1];

        var density = this.noise.OctaveNoiseOptimized(
          newX * wDiv,
          newZ * dDiv,
          newY * hDiv,
          this.Octaves
        );

        //density += Math.abs(Math.cos(2 * y * hDiv * Math.PI)) * 12;
        density += -0.75 * Math.max(newY - 40, 0);
        //density += Math.min(Math.max((newY - 96), 0), 1) * (newY-40) * (0.5 * (newY - 96) * (1/32));
        density += newY * hDiv * 8;
        density += Math.min(Math.max(40 - y, 0), 1) * 20;
        //var sin = Math.sin(wDiv * x + (1/32) * density);
        //density += sin * 32;
        //density += -0.75 * (y - 48);

        if (
          x >= this.xOffset - 1 &&
          z >= this.zOffset - 1 &&
          x < this.width + this.xOffset - 1 &&
          z < this.depth + this.zOffset - 1
        ) {
          if (density >= 0)
            this.voxels[
              x -
                this.xOffset +
                1 +
                (y - this.yOffset + 1) * this.width +
                (z - this.zOffset + 1) * this.width * this.height
            ] = 0x01;
          else
            this.voxels[
              x -
                this.xOffset +
                1 +
                (y - this.yOffset + 1) * this.width +
                (z - this.zOffset + 1) * this.width * this.height
            ] = 0x00;
        }

        if (density >= 0)
          this.lightVoxels[
            x -
              this.xOffset +
              this.lightRadius +
              (y - this.yOffset + 1) * (this.width + this.lightRadius * 2 - 2) +
              (z - this.zOffset + this.lightRadius) *
                (this.width + this.lightRadius * 2 - 2) *
                this.height
          ] = 100;
        else
          this.lightVoxels[
            x -
              this.xOffset +
              this.lightRadius +
              (y - this.yOffset + 1) * (this.width + this.lightRadius * 2 - 2) +
              (z - this.zOffset + this.lightRadius) *
                (this.width + this.lightRadius * 2 - 2) *
                this.height
          ] = 0;

        if (y == 128)
          this.lightVoxels[
            x -
              this.xOffset +
              this.lightRadius +
              (y - this.yOffset + 1) * (this.width + this.lightRadius * 2 - 2) +
              (z - this.zOffset + this.lightRadius) *
                (this.width + this.lightRadius * 2 - 2) *
                this.height
          ] = this.lightRadius;
      }
    }
  }
  var fin = new Date();
  //console.log('Vox Gen:' + (fin - start));
  self.postMessage({
    cmd: "stat",
    label: "Vox Gen:",
    value: fin - start + "ms",
  });
};

VoxelChunk.prototype.CalculateLighting = function () {
  var lightMask = [];
  var lWidth, lHeight, lDepth;
  var pass = [];
  var start = new Date();

  lWidth = this.width + this.lightRadius * 2 - 2;
  lHeight = this.height;
  lDepth = this.depth + this.lightRadius * 2 - 2;

  for (var i = 0; i < lWidth * lDepth; i++) lightMask.push(this.lightRadius);

  for (var y = lHeight - 2; y >= 0; y--) {
    for (var z = 0; z < lDepth; z++) {
      for (var x = 0; x < lWidth; x++) {
        var index = x + z * lWidth;

        if (this.lightVoxels[x + y * lWidth + z * lWidth * lHeight] != 100) {
          this.lightVoxels[x + y * lWidth + z * lWidth * lHeight] =
            lightMask[index];

          if (lightMask[index] == 0) {
            if (
              (x > 0 && lightMask[x - 1 + z * lWidth] == this.lightRadius) ||
              (x < lWidth - 1 &&
                lightMask[x + 1 + z * lWidth] == this.lightRadius) ||
              (z > 0 && lightMask[x + (z - 1) * lWidth] == this.lightRadius) ||
              (z < lDepth - 1 &&
                lightMask[x + (z + 1) * lWidth] == this.lightRadius)
            ) {
              this.lightVoxels[x + y * lWidth + z * lWidth * lHeight] =
                this.lightRadius - 1;
              pass.push(new Vector3(x, y, z));
            }
          }
        } else {
          lightMask[index] = 0;
        }
      }
    }
  }

  while (pass.length > 0) {
    var point = pass.pop();
    var value = this.lightVoxels[
      point.x + point.y * lWidth + point.z * lWidth * lHeight
    ];

    if (value > 0 && value < 100) {
      var _x, _y, _z;
      _x = point.x;
      _y = point.y;
      _z = point.z;

      // Back
      var tmpIndex = _x + _y * lWidth + (_z - 1) * lWidth * lHeight;
      if (_z > 0 && this.lightVoxels[tmpIndex] < value - 1) {
        this.lightVoxels[tmpIndex] = value - 1;
        pass.push(new Vector3(_x, _y, _z - 1));
      }

      // Front
      tmpIndex = _x + _y * lWidth + (_z + 1) * lWidth * lHeight;
      if (_z < lDepth - 1 && this.lightVoxels[tmpIndex] < value - 1) {
        this.lightVoxels[tmpIndex] = value - 1;
        pass.push(new Vector3(_x, _y, _z + 1));
      }

      // Bottom
      tmpIndex = _x + (_y - 1) * lWidth + _z * lWidth * lHeight;
      if (_y > 0 && this.lightVoxels[tmpIndex] < value - 1) {
        this.lightVoxels[tmpIndex] = value - 1;
        pass.push(new Vector3(_x, _y - 1, _z));
      }

      // Top
      tmpIndex = _x + (_y + 1) * lWidth + _z * lWidth * lHeight;
      if (_y < lHeight - 1 && this.lightVoxels[tmpIndex] < value - 1) {
        this.lightVoxels[tmpIndex] = value - 1;
        pass.push(new Vector3(_x, _y + 1, _z));
      }

      // Left
      tmpIndex = _x - 1 + _y * lWidth + _z * lWidth * lHeight;
      if (_x > 0 && this.lightVoxels[tmpIndex] < value - 1) {
        this.lightVoxels[tmpIndex] = value - 1;
        pass.push(new Vector3(_x - 1, _y, _z));
      }

      // Right
      tmpIndex = _x + 1 + _y * lWidth + _z * lWidth * lHeight;
      if (_x < lWidth - 1 && this.lightVoxels[tmpIndex] < value - 1) {
        this.lightVoxels[tmpIndex] = value - 1;
        pass.push(new Vector3(_x + 1, _y, _z));
      }
    }
  }

  var fin = new Date();
  //console.log('Light Calc:' + (fin - start));
  self.postMessage({
    cmd: "stat",
    label: "Light Calc:",
    value: fin - start + "ms",
  });
};

VoxelChunk.prototype.CreateGeometry = function (callBack) {
  var start = new Date();
  for (var i = 0; i < this.yBlocks; i++) {
    for (var j = 0; j < this.zBlocks; j++) {
      for (var k = 0; k < this.xBlocks; k++) {
        var geometry = new Geometry();

        // Don't use offsets, we can use the offets to position the mesh later.
        //  Potentially if we want to keep the player at (0,0) and move the world
        //  around them.
        for (var y = 0; y < 32; y++) {
          for (var z = 0; z < 32; z++) {
            for (var x = 0; x < 32; x++) {
              var _y = y + (1 + i * 32);
              var _x = x + (1 + k * 32);
              var _z = z + (1 + j * 32);

              if (
                this.voxels[
                  _x + _y * this.width + _z * this.width * this.height
                ] != 0x00
              ) {
                // BACK FACES
                var tmpValues = this.GetSurroundingBlock(_x, _y, _z);

                if (
                  this.voxels[
                    _x + _y * this.width + (_z - 1) * this.width * this.height
                  ] == 0x00
                ) {
                  var aoValues = this.GetAOValues(_y, "BACK", tmpValues);

                  geometry.faceColors.push(this.GetLightValue(_x, _y, _z - 1));

                  var index = geometry.vertices.length - 1;
                  geometry.vertices.push(new Vector3(x, y + 1, z));
                  geometry.vertices.push(new Vector3(x + 1, y + 1, z));
                  geometry.vertices.push(new Vector3(x + 1, y, z));
                  geometry.vertices.push(new Vector3(x, y, z));

                  if (this.FlipQuads(aoValues)) {
                    geometry.faces.push(
                      new Face3(index + 4, index + 1, index + 2)
                    );
                    geometry.faces.push(
                      new Face3(index + 2, index + 3, index + 4)
                    );
                    geometry.colors.push(aoValues[3]);
                    geometry.colors.push(aoValues[1]);
                    geometry.colors.push(aoValues[0]);
                    geometry.colors.push(aoValues[0]);
                    geometry.colors.push(aoValues[2]);
                    geometry.colors.push(aoValues[3]);
                  } else {
                    geometry.faces.push(
                      new Face3(index + 1, index + 2, index + 3)
                    );
                    geometry.faces.push(
                      new Face3(index + 3, index + 4, index + 1)
                    );
                    geometry.colors.push(aoValues[1]);
                    geometry.colors.push(aoValues[0]);
                    geometry.colors.push(aoValues[2]);
                    geometry.colors.push(aoValues[2]);
                    geometry.colors.push(aoValues[3]);
                    geometry.colors.push(aoValues[1]);
                  }
                }
                // FRONT FACES
                if (
                  this.voxels[
                    _x + _y * this.width + (_z + 1) * this.width * this.height
                  ] == 0x00
                ) {
                  var aoValues = this.GetAOValues(_y, "FRONT", tmpValues);

                  geometry.faceColors.push(this.GetLightValue(_x, _y, _z + 1));

                  var index = geometry.vertices.length - 1;
                  geometry.vertices.push(new Vector3(x + 1, y + 1, z + 1));
                  geometry.vertices.push(new Vector3(x, y + 1, z + 1));
                  geometry.vertices.push(new Vector3(x, y, z + 1));
                  geometry.vertices.push(new Vector3(x + 1, y, z + 1));

                  if (this.FlipQuads(aoValues)) {
                    geometry.faces.push(
                      new Face3(index + 4, index + 1, index + 2)
                    );
                    geometry.faces.push(
                      new Face3(index + 2, index + 3, index + 4)
                    );
                    geometry.colors.push(aoValues[3]);
                    geometry.colors.push(aoValues[1]);
                    geometry.colors.push(aoValues[0]);
                    geometry.colors.push(aoValues[0]);
                    geometry.colors.push(aoValues[2]);
                    geometry.colors.push(aoValues[3]);
                  } else {
                    geometry.faces.push(
                      new Face3(index + 1, index + 2, index + 3)
                    );
                    geometry.faces.push(
                      new Face3(index + 3, index + 4, index + 1)
                    );
                    geometry.colors.push(aoValues[1]);
                    geometry.colors.push(aoValues[0]);
                    geometry.colors.push(aoValues[2]);
                    geometry.colors.push(aoValues[2]);
                    geometry.colors.push(aoValues[3]);
                    geometry.colors.push(aoValues[1]);
                  }
                }
                // BOTTOM FACES
                if (
                  this.voxels[
                    _x + (_y - 1) * this.width + _z * this.width * this.height
                  ] == 0x00
                ) {
                  var aoValues = this.GetAOValues(_y, "BOTTOM", tmpValues);

                  geometry.faceColors.push(this.GetLightValue(_x, _y - 1, _z));

                  var index = geometry.vertices.length - 1;
                  geometry.vertices.push(new Vector3(x + 1, y, z + 1));
                  geometry.vertices.push(new Vector3(x, y, z + 1));
                  geometry.vertices.push(new Vector3(x, y, z));
                  geometry.vertices.push(new Vector3(x + 1, y, z));

                  if (this.FlipQuads(aoValues)) {
                    geometry.faces.push(
                      new Face3(index + 4, index + 1, index + 2)
                    );
                    geometry.faces.push(
                      new Face3(index + 2, index + 3, index + 4)
                    );
                    geometry.colors.push(aoValues[3]);
                    geometry.colors.push(aoValues[1]);
                    geometry.colors.push(aoValues[0]);
                    geometry.colors.push(aoValues[0]);
                    geometry.colors.push(aoValues[2]);
                    geometry.colors.push(aoValues[3]);
                  } else {
                    geometry.faces.push(
                      new Face3(index + 1, index + 2, index + 3)
                    );
                    geometry.faces.push(
                      new Face3(index + 3, index + 4, index + 1)
                    );
                    geometry.colors.push(aoValues[1]);
                    geometry.colors.push(aoValues[0]);
                    geometry.colors.push(aoValues[2]);
                    geometry.colors.push(aoValues[2]);
                    geometry.colors.push(aoValues[3]);
                    geometry.colors.push(aoValues[1]);
                  }
                }
                // TOP FACES
                if (
                  _y + this.yOffset == 128 ||
                  this.voxels[
                    _x + (_y + 1) * this.width + _z * this.width * this.height
                  ] == 0x00
                ) {
                  var aoValues = this.GetAOValues(_y, "TOP", tmpValues);

                  geometry.faceColors.push(this.GetLightValue(_x, _y + 1, _z));

                  var index = geometry.vertices.length - 1;
                  geometry.vertices.push(new Vector3(x + 1, y + 1, z));
                  geometry.vertices.push(new Vector3(x, y + 1, z));
                  geometry.vertices.push(new Vector3(x, y + 1, z + 1));
                  geometry.vertices.push(new Vector3(x + 1, y + 1, z + 1));

                  if (this.FlipQuads(aoValues)) {
                    geometry.faces.push(
                      new Face3(index + 4, index + 1, index + 2)
                    );
                    geometry.faces.push(
                      new Face3(index + 2, index + 3, index + 4)
                    );
                    geometry.colors.push(aoValues[3]);
                    geometry.colors.push(aoValues[1]);
                    geometry.colors.push(aoValues[0]);
                    geometry.colors.push(aoValues[0]);
                    geometry.colors.push(aoValues[2]);
                    geometry.colors.push(aoValues[3]);
                  } else {
                    geometry.faces.push(
                      new Face3(index + 1, index + 2, index + 3)
                    );
                    geometry.faces.push(
                      new Face3(index + 3, index + 4, index + 1)
                    );
                    geometry.colors.push(aoValues[1]);
                    geometry.colors.push(aoValues[0]);
                    geometry.colors.push(aoValues[2]);
                    geometry.colors.push(aoValues[2]);
                    geometry.colors.push(aoValues[3]);
                    geometry.colors.push(aoValues[1]);
                  }
                }
                // LEFT FACES
                if (
                  this.voxels[
                    _x - 1 + _y * this.width + _z * this.width * this.height
                  ] == 0x00
                ) {
                  var aoValues = this.GetAOValues(_y, "LEFT", tmpValues);

                  geometry.faceColors.push(this.GetLightValue(_x - 1, _y, _z));

                  var index = geometry.vertices.length - 1;
                  geometry.vertices.push(new Vector3(x, y + 1, z + 1));
                  geometry.vertices.push(new Vector3(x, y + 1, z));
                  geometry.vertices.push(new Vector3(x, y, z));
                  geometry.vertices.push(new Vector3(x, y, z + 1));

                  if (this.FlipQuads(aoValues)) {
                    geometry.faces.push(
                      new Face3(index + 4, index + 1, index + 2)
                    );
                    geometry.faces.push(
                      new Face3(index + 2, index + 3, index + 4)
                    );
                    geometry.colors.push(aoValues[3]);
                    geometry.colors.push(aoValues[1]);
                    geometry.colors.push(aoValues[0]);
                    geometry.colors.push(aoValues[0]);
                    geometry.colors.push(aoValues[2]);
                    geometry.colors.push(aoValues[3]);
                  } else {
                    geometry.faces.push(
                      new Face3(index + 1, index + 2, index + 3)
                    );
                    geometry.faces.push(
                      new Face3(index + 3, index + 4, index + 1)
                    );
                    geometry.colors.push(aoValues[1]);
                    geometry.colors.push(aoValues[0]);
                    geometry.colors.push(aoValues[2]);
                    geometry.colors.push(aoValues[2]);
                    geometry.colors.push(aoValues[3]);
                    geometry.colors.push(aoValues[1]);
                  }
                }
                // RIGHT FACES
                if (
                  this.voxels[
                    _x + 1 + _y * this.width + _z * this.width * this.height
                  ] == 0x00
                ) {
                  var aoValues = this.GetAOValues(_y, "RIGHT", tmpValues);

                  geometry.faceColors.push(this.GetLightValue(_x + 1, _y, _z));

                  var index = geometry.vertices.length - 1;
                  geometry.vertices.push(new Vector3(x + 1, y + 1, z));
                  geometry.vertices.push(new Vector3(x + 1, y + 1, z + 1));
                  geometry.vertices.push(new Vector3(x + 1, y, z + 1));
                  geometry.vertices.push(new Vector3(x + 1, y, z));

                  if (this.FlipQuads(aoValues)) {
                    geometry.faces.push(
                      new Face3(index + 4, index + 1, index + 2)
                    );
                    geometry.faces.push(
                      new Face3(index + 2, index + 3, index + 4)
                    );
                    geometry.colors.push(aoValues[3]);
                    geometry.colors.push(aoValues[1]);
                    geometry.colors.push(aoValues[0]);
                    geometry.colors.push(aoValues[0]);
                    geometry.colors.push(aoValues[2]);
                    geometry.colors.push(aoValues[3]);
                  } else {
                    geometry.faces.push(
                      new Face3(index + 1, index + 2, index + 3)
                    );
                    geometry.faces.push(
                      new Face3(index + 3, index + 4, index + 1)
                    );
                    geometry.colors.push(aoValues[1]);
                    geometry.colors.push(aoValues[0]);
                    geometry.colors.push(aoValues[2]);
                    geometry.colors.push(aoValues[2]);
                    geometry.colors.push(aoValues[3]);
                    geometry.colors.push(aoValues[1]);
                  }
                }
              }
            }
          }
        }

        geometry.x = k * 32 + this.xOffset;
        geometry.z = j * 32 + this.zOffset;
        geometry.y = i * 32 + this.yOffset;

        callBack(geometry);
      }
    }
  }
  var fin = new Date();
  //console.log('Geometry:' + (fin - start));
  self.postMessage({
    cmd: "stat",
    label: "Geometry:",
    value: fin - start + "ms",
  });
};

VoxelChunk.prototype.FlipQuads = function (aoValues) {
  if (aoValues[1] + aoValues[2] == 3 && aoValues[3] + aoValues[0] == 4) {
    return true;
  } else if (aoValues[1] + aoValues[2] == 4 && aoValues[3] + aoValues[0] == 3) {
    return false;
  }

  if (aoValues[1] + aoValues[2] > aoValues[0] + aoValues[3]) {
    return true;
  } else if (aoValues[1] + aoValues[2] == aoValues[0] + aoValues[3]) {
    var val = aoValues[1] + aoValues[2] + aoValues[3];
    if (val % 3 != 0) {
      return true;
    }
  }

  return false;
};

VoxelChunk.prototype.GetSurroundingBlock = function (x, y, z) {
  var tmpValues = [];

  for (_y = y - 1; _y <= y + 1; _y++) {
    for (_z = z - 1; _z <= z + 1; _z++) {
      for (_x = x - 1; _x <= x + 1; _x++) {
        if (
          this.voxels[_x + _y * this.width + _z * this.width * this.height] > 0
        )
          tmpValues.push(1);
        else tmpValues.push(0);
      }
    }
  }

  return tmpValues;
};

VoxelChunk.prototype.GetSurroundingLight = function (_x, _y, _z) {
  var tmpValues = [];

  for (y = _y - 1; y <= _y + 1; y++) {
    for (z = _z - 1; z <= _z + 1; z++) {
      for (x = _x - 1; x <= _x + 1; x++) {
        var val = this.lightVoxels[
          x +
            this.lightRadius +
            (y + (z + this.lightRadius) * this.height) * this.width
        ];
        tmpValues.push(val == 100 ? 0 : val);
      }
    }
  }

  return tmpValues;
};

VoxelChunk.prototype.GetAOValues = function (y, dir, tmpValues) {
  var aoValues = new Int8Array(4);

  switch (dir) {
    case "TOP":
      aoValues[0] = this.VertexAO(tmpValues[21], tmpValues[19], tmpValues[18]);
      aoValues[1] = this.VertexAO(tmpValues[19], tmpValues[23], tmpValues[20]);
      aoValues[2] = this.VertexAO(tmpValues[21], tmpValues[25], tmpValues[24]);
      aoValues[3] = this.VertexAO(tmpValues[23], tmpValues[25], tmpValues[26]);
      break;
    case "BOTTOM":
      aoValues[0] = this.VertexAO(tmpValues[3], tmpValues[7], tmpValues[6]);
      aoValues[1] = this.VertexAO(tmpValues[5], tmpValues[7], tmpValues[8]);
      aoValues[2] = this.VertexAO(tmpValues[1], tmpValues[3], tmpValues[0]);
      aoValues[3] = this.VertexAO(tmpValues[1], tmpValues[5], tmpValues[2]);
      break;
    case "FRONT":
      aoValues[0] = this.VertexAO(tmpValues[15], tmpValues[25], tmpValues[24]);
      aoValues[1] = this.VertexAO(tmpValues[17], tmpValues[25], tmpValues[26]);
      aoValues[2] = this.VertexAO(tmpValues[7], tmpValues[15], tmpValues[6]);
      aoValues[3] = this.VertexAO(tmpValues[7], tmpValues[17], tmpValues[8]);
      break;
    case "BACK":
      aoValues[0] = this.VertexAO(tmpValues[11], tmpValues[19], tmpValues[20]);
      aoValues[1] = this.VertexAO(tmpValues[9], tmpValues[19], tmpValues[18]);
      aoValues[2] = this.VertexAO(tmpValues[1], tmpValues[11], tmpValues[2]);
      aoValues[3] = this.VertexAO(tmpValues[1], tmpValues[9], tmpValues[0]);
      break;
    case "LEFT":
      aoValues[0] = this.VertexAO(tmpValues[9], tmpValues[21], tmpValues[18]);
      aoValues[1] = this.VertexAO(tmpValues[15], tmpValues[21], tmpValues[24]);
      aoValues[2] = this.VertexAO(tmpValues[3], tmpValues[9], tmpValues[0]);
      aoValues[3] = this.VertexAO(tmpValues[3], tmpValues[15], tmpValues[6]);
      break;
    case "RIGHT":
      aoValues[0] = this.VertexAO(tmpValues[17], tmpValues[23], tmpValues[26]);
      aoValues[1] = this.VertexAO(tmpValues[11], tmpValues[23], tmpValues[20]);
      aoValues[2] = this.VertexAO(tmpValues[5], tmpValues[17], tmpValues[8]);
      aoValues[3] = this.VertexAO(tmpValues[5], tmpValues[11], tmpValues[2]);
      break;
  }

  if (y + this.yOffset == 128 && dir != "BOTTOM") {
    aoValues[1] = 0;
    aoValues[0] = 0;
    if (dir == "TOP") {
      aoValues[2] = 0;
      aoValues[3] = 0;
    }
  }

  return aoValues;
};

VoxelChunk.prototype.VertexAO = function (side1, side2, corner) {
  if (side1 && side2) {
    return 3;
  }
  return side1 + side2 + corner;
};

var jobs = new Array();
var noise;
var isRunning = false;
var startedOn;
var date = new Date();

self.addEventListener("message", handleMessage);

function handleMessage(e) {
  var data = e.data;
  switch (data.cmd) {
    case "init":
      self.postMessage({ cmd: "ready" });
      wakeUp();
      break;
    case "gen":
      self.postMessage({ cmd: "stat", label: "Gen Start:", value: "Okay" });
      jobs.push(data);
      if (!isRunning) wakeUp();
      break;
  }
}

function wakeUp() {
  if (!isRunning) {
    startedOn = date.getTime();
    isRunning = true;
    monitorJobs();
  }
}

function monitorJobs() {
  if (jobs.length > 0) {
    var job = jobs.shift();
    var chunk = new VoxelChunk(noise, job.x, job.y, job.z, job.w, job.h, job.d);
    chunk.CreateChunk();
    chunk.CalculateLighting();
    chunk.CreateGeometry(sendBlock);
  } else {
    if (date.getTime() - startedOn > 1000 * 60) {
      isRunning = false;
      return;
    }
  }
  setTimeout(monitorJobs, 1);
}

function sendBlock(geometry) {
  if (geometry.vertices.length > 0) {
    var vertexBuffer = geometry.GetVertexBuffer();
    var faceBuffer = geometry.GetFaceBuffer();
    var colorBuffer = geometry.GetColorBuffer();
    var lightBuffer = geometry.GetLightBuffer();

    self.postMessage(
      {
        cmd: "chunk",
        x: geometry.x,
        y: geometry.y,
        z: geometry.z,
        vertices: vertexBuffer,
        faces: faceBuffer,
        colors: colorBuffer,
        lights: lightBuffer,
      },
      [vertexBuffer, faceBuffer, colorBuffer, lightBuffer]
    );
  }
}
