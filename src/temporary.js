class RefValue {
  constructor(value) {
    this.val = value;
  }
}

class Geometry {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.z = 0;
    this.vertices = new Array();
    this.faces = new Array();
    this.colors = new Array();
    this.faceColors = new Array();
  }
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

// Needed a seedable random function
// ==================================
function Rand(seed) {
  this.m_w = seed;
  this.m_z = 987654321;
  this.mask = 0xffffffff;

  this.Next = function () {
    this.m_z = (36969 * (this.m_z & 65535) + (this.m_z >> 16)) & this.mask;
    this.m_w = (18000 * (this.m_w & 65535) + (this.m_w >> 16)) & this.mask;
    var result = ((this.m_z << 16) + this.m_w) & this.mask;
    result /= 4294967296;
    return result + 0.5;
  };
}

// Implementation of Ken Perlin's improved noise algorithm
//  Just perlin noise, not simplex noise.
// ========================================================
function ImprovedPerlin(seed) {
  this.p = new Array(512);
  this.rand = new Rand(seed);

  for (var i = 0; i < 256; i++) this.p[i] = i;

  for (var i = 255; i > 0; i--) {
    var j = Math.floor(this.rand.Next() * (i + 1));
    var tmp = this.p[j];
    this.p[j] = this.p[i];
    this.p[i] = tmp;
    this.p[i + 256] = this.p[i];
    this.p[j + 256] = this.p[j];
  }

  this.Fade = function (t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
  };

  this.Lerp = function (t, a, b) {
    return a + t * (b - a);
  };

  this.Grad = function (hash, x, y, z) {
    var h = hash & 15;
    var u = h < 8 ? x : y;
    var v = h < 4 ? y : h == 12 || h == 14 ? x : z;

    return ((h & 1) == 0 ? u : -u) + ((h & 2) == 0 ? v : -v);
  };

  this.Noise = function (x, y, z) {
    var X = x & 255;
    var Y = y & 255;
    var Z = z & 255;

    x = x - Math.floor(x);
    y = y - Math.floor(y);
    z = z - Math.floor(z);

    var u = this.Fade(x);
    var v = this.Fade(y);
    var w = this.Fade(z);

    var A = this.p[X] + Y;
    var AA = this.p[A] + Z;
    var AB = this.p[A + 1] + Z;
    var B = this.p[X + 1] + Y;
    var BA = this.p[B] + Z;
    var BB = this.p[B + 1] + Z;

    var value = this.Lerp(
      w,
      this.Lerp(
        v,
        this.Lerp(
          u,
          this.Grad(this.p[AA], x, y, z),
          this.Grad(this.p[BA], x - 1, y, z)
        ),
        this.Lerp(
          u,
          this.Grad(this.p[AB], x, y - 1, z),
          this.Grad(this.p[BB], x - 1, y - 1, z)
        )
      ),
      this.Lerp(
        v,
        this.Lerp(
          u,
          this.Grad(this.p[AA + 1], x, y, z - 1),
          this.Grad(this.p[BA + 1], x - 1, y, z - 1)
        ),
        this.Lerp(
          u,
          this.Grad(this.p[AB + 1], x, y - 1, z - 1),
          this.Grad(this.p[BB + 1], x - 1, y - 1, z - 1)
        )
      )
    );

    return value;
  };

  this.OctaveNoise = function (_x, _y, _z, octaves) {
    var value = 0;

    for (var i = 0; i < octaves.length; i++) {
      var x, y, z;
      x = octaves[i].xFreq * _x;
      y = octaves[i].yFreq * _y;
      z = octaves[i].zFreq * _z;

      var xF = Math.floor(x);
      var yF = Math.floor(y);
      var zF = Math.floor(z);

      var X = xF & 255;
      var Y = yF & 255;
      var Z = zF & 255;

      x = x - xF;
      y = y - yF;
      z = z - zF;

      var u = this.Fade(x);
      var v = this.Fade(y);
      var w = this.Fade(z);

      var A = this.p[X] + Y;
      var AA = this.p[A] + Z;
      var AB = this.p[A + 1] + Z;
      var B = this.p[X + 1] + Y;
      var BA = this.p[B] + Z;
      var BB = this.p[B + 1] + Z;

      var v = this.Lerp(
        w,
        this.Lerp(
          v,
          this.Lerp(
            u,
            this.Grad(this.p[AA], x, y, z),
            this.Grad(this.p[BA], x - 1, y, z)
          ),
          this.Lerp(
            u,
            this.Grad(this.p[AB], x, y - 1, z),
            this.Grad(this.p[BB], x - 1, y - 1, z)
          )
        ),
        this.Lerp(
          v,
          this.Lerp(
            u,
            this.Grad(this.p[AA + 1], x, y, z - 1),
            this.Grad(this.p[BA + 1], x - 1, y, z - 1)
          ),
          this.Lerp(
            u,
            this.Grad(this.p[AB + 1], x, y - 1, z - 1),
            this.Grad(this.p[BB + 1], x - 1, y - 1, z - 1)
          )
        )
      );
      value += v * octaves[i].amplitude;
    }

    return value;
  };

  this.WarpPoint = function (
    _x,
    _y,
    _z,
    wDiv,
    hDiv,
    dDiv,
    times,
    amplitude,
    frequency
  ) {
    var x, y, z, u, v, w;
    var xF, yF, zF, X, Y, Z, A, AA, AB, B, BA, BB;
    var hash;
    var hu, hv;
    var value;
    var g000, g001, g010, g011, g100, g101, g110, g111;
    var l000, l001, l010, l011, l100, l101, l110;
    var value;
    var i;

    var point = [];
    point[0] = _x;
    point[1] = _y;
    point[2] = _z;

    for (i = 0; i < 3 && i < times; i++) {
      x = point[0] * wDiv * frequency;
      y = point[1] * hDiv * frequency;
      z = point[2] * dDiv * frequency;

      xF = Math.floor(x);
      yF = Math.floor(y);
      zF = Math.floor(z);

      // Find Unit Cube that Contains Point
      X = xF & 255;
      Y = yF & 255;
      Z = zF & 255;

      // Find Relative (X,Y,Z) of point in Cube
      x -= xF;
      y -= yF;
      z -= zF;

      // Compute fade curves for (x,y,z)
      u = x * x * x * (x * (x * 6 - 15) + 10);
      v = y * y * y * (y * (y * 6 - 15) + 10);
      w = z * z * z * (z * (z * 6 - 15) + 10);

      // Hash coordinates of the 8 cube corners
      A = this.p[X] + Y;
      AA = this.p[A] + Z;
      AB = this.p[A + 1] + Z;
      B = this.p[X + 1] + Y;
      BA = this.p[B] + Z;
      BB = this.p[B + 1] + Z;

      // Add blended results from 8 corners of cube

      // GRADIENTS
      // ================

      hash = this.p[BB + 1] & 15;
      hu = hash < 8 ? x - 1 : y - 1;
      hv = hash < 4 ? y - 1 : hash == 12 || hash == 14 ? x - 1 : z - 1;
      g000 = ((hash & 1) == 0 ? hu : -hu) + ((hash & 2) == 0 ? hv : -hv);

      hash = this.p[AB + 1] & 15;
      hu = hash < 8 ? x : y - 1;
      hv = hash < 4 ? y - 1 : hash == 12 || hash == 14 ? x : z - 1;
      g001 = ((hash & 1) == 0 ? hu : -hu) + ((hash & 2) == 0 ? hv : -hv);

      hash = this.p[BA + 1] & 15;
      hu = hash < 8 ? x - 1 : y;
      hv = hash < 4 ? y : hash == 12 || hash == 14 ? x - 1 : z - 1;
      g010 = ((hash & 1) == 0 ? hu : -hu) + ((hash & 2) == 0 ? hv : -hv);

      hash = this.p[AA + 1] & 15;
      hu = hash < 8 ? x : y;
      hv = hash < 4 ? y : hash == 12 || hash == 14 ? x : z - 1;
      g011 = ((hash & 1) == 0 ? hu : -hu) + ((hash & 2) == 0 ? hv : -hv);

      hash = this.p[BB] & 15;
      hu = hash < 8 ? x - 1 : y - 1;
      hv = hash < 4 ? y - 1 : hash == 12 || hash == 14 ? x - 1 : z;
      g100 = ((hash & 1) == 0 ? hu : -hu) + ((hash & 2) == 0 ? hv : -hv);

      hash = this.p[AB] & 15;
      hu = hash < 8 ? x : y - 1;
      hv = hash < 4 ? y - 1 : hash == 12 || hash == 14 ? x : z;
      g101 = ((hash & 1) == 0 ? hu : -hu) + ((hash & 2) == 0 ? hv : -hv);

      hash = this.p[BA] & 15;
      hu = hash < 8 ? x - 1 : y;
      hv = hash < 4 ? y : hash == 12 || hash == 14 ? x - 1 : z;
      g110 = ((hash & 1) == 0 ? hu : -hu) + ((hash & 2) == 0 ? hv : -hv);

      hash = this.p[AA] & 15;
      hu = hash < 8 ? x : y;
      hv = hash < 4 ? y : hash == 12 || hash == 14 ? x : z;
      g111 = ((hash & 1) == 0 ? hu : -hu) + ((hash & 2) == 0 ? hv : -hv);

      // ===================

      // Final LERP
      // ============

      l000 = g001 + u * (g000 - g001);
      l001 = g011 + u * (g010 - g011);
      l010 = g101 + u * (g100 - g101);
      l011 = g111 + u * (g110 - g111);

      l100 = l001 + v * (l000 - l001);
      l101 = l011 + v * (l010 - l011);

      l110 = l101 + w * (l100 - l101);

      // ==============

      value = l110 * amplitude;
      point[i] = value + point[i];
    }

    for (var j = i; j < 3; j++) {
      point[j] = point[j] + value;
    }

    return point;
  };

  this.NoiseOptimized = function (x, y, z) {
    var u, v, w;
    var xF, yF, zF, X, Y, Z, A, AA, AB, B, BA, BB;
    var hash;
    var hu, hv;
    var g000, g001, g010, g011, g100, g101, g110, g111;
    var l000, l001, l010, l011, l100, l101, l110;

    xF = Math.floor(x);
    yF = Math.floor(y);
    zF = Math.floor(z);

    // Find Unit Cube that Contains Point
    X = xF & 255;
    Y = yF & 255;
    Z = zF & 255;

    // Find Relative (X,Y,Z) of point in Cube
    x -= xF;
    y -= yF;
    z -= zF;

    // Compute fade curves for (x,y,z)
    u = x * x * x * (x * (x * 6 - 15) + 10);
    v = y * y * y * (y * (y * 6 - 15) + 10);
    w = z * z * z * (z * (z * 6 - 15) + 10);

    // Hash coordinates of the 8 cube corners
    A = this.p[X] + Y;
    AA = this.p[A] + Z;
    AB = this.p[A + 1] + Z;
    B = this.p[X + 1] + Y;
    BA = this.p[B] + Z;
    BB = this.p[B + 1] + Z;

    // Add blended results from 8 corners of cube

    // GRADIENTS
    // ================

    hash = this.p[BB + 1] & 15;
    hu = hash < 8 ? x - 1 : y - 1;
    hv = hash < 4 ? y - 1 : hash == 12 || hash == 14 ? x - 1 : z - 1;
    g000 = ((hash & 1) == 0 ? hu : -hu) + ((hash & 2) == 0 ? hv : -hv);

    hash = this.p[AB + 1] & 15;
    hu = hash < 8 ? x : y - 1;
    hv = hash < 4 ? y - 1 : hash == 12 || hash == 14 ? x : z - 1;
    g001 = ((hash & 1) == 0 ? hu : -hu) + ((hash & 2) == 0 ? hv : -hv);

    hash = this.p[BA + 1] & 15;
    hu = hash < 8 ? x - 1 : y;
    hv = hash < 4 ? y : hash == 12 || hash == 14 ? x - 1 : z - 1;
    g010 = ((hash & 1) == 0 ? hu : -hu) + ((hash & 2) == 0 ? hv : -hv);

    hash = this.p[AA + 1] & 15;
    hu = hash < 8 ? x : y;
    hv = hash < 4 ? y : hash == 12 || hash == 14 ? x : z - 1;
    g011 = ((hash & 1) == 0 ? hu : -hu) + ((hash & 2) == 0 ? hv : -hv);

    hash = this.p[BB] & 15;
    hu = hash < 8 ? x - 1 : y - 1;
    hv = hash < 4 ? y - 1 : hash == 12 || hash == 14 ? x - 1 : z;
    g100 = ((hash & 1) == 0 ? hu : -hu) + ((hash & 2) == 0 ? hv : -hv);

    hash = this.p[AB] & 15;
    hu = hash < 8 ? x : y - 1;
    hv = hash < 4 ? y - 1 : hash == 12 || hash == 14 ? x : z;
    g101 = ((hash & 1) == 0 ? hu : -hu) + ((hash & 2) == 0 ? hv : -hv);

    hash = this.p[BA] & 15;
    hu = hash < 8 ? x - 1 : y;
    hv = hash < 4 ? y : hash == 12 || hash == 14 ? x - 1 : z;
    g110 = ((hash & 1) == 0 ? hu : -hu) + ((hash & 2) == 0 ? hv : -hv);

    hash = this.p[AA] & 15;
    hu = hash < 8 ? x : y;
    hv = hash < 4 ? y : hash == 12 || hash == 14 ? x : z;
    g111 = ((hash & 1) == 0 ? hu : -hu) + ((hash & 2) == 0 ? hv : -hv);

    // ===================

    // Final LERP
    // ============

    l000 = g001 + u * (g000 - g001);
    l001 = g011 + u * (g010 - g011);
    l010 = g101 + u * (g100 - g101);
    l011 = g111 + u * (g110 - g111);

    l100 = l001 + v * (l000 - l001);
    l101 = l011 + v * (l010 - l011);

    l110 = l101 + w * (l100 - l101);

    // ==============

    return l110;
  };

  this.OctaveNoiseOptimized = function (_x, _y, _z, octaves) {
    var value = 0;
    var x, y, z, u, v, w;
    var xF, yF, zF, X, Y, Z, A, AA, AB, B, BA, BB;
    var hash;
    var hu, hv;
    var g000, g001, g010, g011, g100, g101, g110, g111;
    var l000, l001, l010, l011, l100, l101, l110;

    for (var i = 0; i < octaves.length; i++) {
      x, y, z;
      x = octaves[i].xFreq * _x;
      y = octaves[i].yFreq * _y;
      z = octaves[i].zFreq * _z;

      xF = Math.floor(x);
      yF = Math.floor(y);
      zF = Math.floor(z);

      // Find Unit Cube that Contains Point
      X = xF & 255;
      Y = yF & 255;
      Z = zF & 255;

      // Find Relative (X,Y,Z) of point in Cube
      x -= xF;
      y -= yF;
      z -= zF;

      // Compute fade curves for (x,y,z)
      u = x * x * x * (x * (x * 6 - 15) + 10);
      v = y * y * y * (y * (y * 6 - 15) + 10);
      w = z * z * z * (z * (z * 6 - 15) + 10);

      // Hash coordinates of the 8 cube corners
      A = this.p[X] + Y;
      AA = this.p[A] + Z;
      AB = this.p[A + 1] + Z;
      B = this.p[X + 1] + Y;
      BA = this.p[B] + Z;
      BB = this.p[B + 1] + Z;

      // Add blended results from 8 corners of cube

      // GRADIENTS
      // ================

      hash = this.p[BB + 1] & 15;
      hu = hash < 8 ? x - 1 : y - 1;
      hv = hash < 4 ? y - 1 : hash == 12 || hash == 14 ? x - 1 : z - 1;
      g000 = ((hash & 1) == 0 ? hu : -hu) + ((hash & 2) == 0 ? hv : -hv);

      hash = this.p[AB + 1] & 15;
      hu = hash < 8 ? x : y - 1;
      hv = hash < 4 ? y - 1 : hash == 12 || hash == 14 ? x : z - 1;
      g001 = ((hash & 1) == 0 ? hu : -hu) + ((hash & 2) == 0 ? hv : -hv);

      hash = this.p[BA + 1] & 15;
      hu = hash < 8 ? x - 1 : y;
      hv = hash < 4 ? y : hash == 12 || hash == 14 ? x - 1 : z - 1;
      g010 = ((hash & 1) == 0 ? hu : -hu) + ((hash & 2) == 0 ? hv : -hv);

      hash = this.p[AA + 1] & 15;
      hu = hash < 8 ? x : y;
      hv = hash < 4 ? y : hash == 12 || hash == 14 ? x : z - 1;
      g011 = ((hash & 1) == 0 ? hu : -hu) + ((hash & 2) == 0 ? hv : -hv);

      hash = this.p[BB] & 15;
      hu = hash < 8 ? x - 1 : y - 1;
      hv = hash < 4 ? y - 1 : hash == 12 || hash == 14 ? x - 1 : z;
      g100 = ((hash & 1) == 0 ? hu : -hu) + ((hash & 2) == 0 ? hv : -hv);

      hash = this.p[AB] & 15;
      hu = hash < 8 ? x : y - 1;
      hv = hash < 4 ? y - 1 : hash == 12 || hash == 14 ? x : z;
      g101 = ((hash & 1) == 0 ? hu : -hu) + ((hash & 2) == 0 ? hv : -hv);

      hash = this.p[BA] & 15;
      hu = hash < 8 ? x - 1 : y;
      hv = hash < 4 ? y : hash == 12 || hash == 14 ? x - 1 : z;
      g110 = ((hash & 1) == 0 ? hu : -hu) + ((hash & 2) == 0 ? hv : -hv);

      hash = this.p[AA] & 15;
      hu = hash < 8 ? x : y;
      hv = hash < 4 ? y : hash == 12 || hash == 14 ? x : z;
      g111 = ((hash & 1) == 0 ? hu : -hu) + ((hash & 2) == 0 ? hv : -hv);

      // ===================

      // Final LERP
      // ============

      l000 = g001 + u * (g000 - g001);
      l001 = g011 + u * (g010 - g011);
      l010 = g101 + u * (g100 - g101);
      l011 = g111 + u * (g110 - g111);

      l100 = l001 + v * (l000 - l001);
      l101 = l011 + v * (l010 - l011);

      l110 = l101 + w * (l100 - l101);

      // ==============

      value += l110 * octaves[i].amplitude;
    }

    return value;
  };
}

class VoxelChunk {
  constructor(noise, x, y, z, width, height, depth) {
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

const filledWithBlock = 100;

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

        density += -0.75 * Math.max(newY - 40, 0);
        density += newY * hDiv * 8;
        density += Math.min(Math.max(40 - y, 0), 1) * 20;

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
          ] = filledWithBlock;
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
        const i = x + y * lWidth + z * lWidth * lHeight;
        const maxLight = this.lightRadius;

        if (this.lightVoxels[i] != filledWithBlock) {
          this.lightVoxels[i] = lightMask[index];

          const lightToRight = lightMask[x - 1 + z * lWidth] == maxLight;
          const lightToLeft = lightMask[x + 1 + z * lWidth] == maxLight;
          const lightToFront = lightMask[x + (z - 1) * lWidth] == maxLight;
          const lightToBack = lightMask[x + (z + 1) * lWidth] == maxLight;
          if (lightMask[index] == 0) {
            if (lightToRight || lightToLeft || lightToFront || lightToBack) {
              this.lightVoxels[i] = maxLight - 1;
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
    const { x: _x, y: _y, z: _z } = pass.pop();

    const index = _x + _y * lWidth + _z * lWidth * lHeight;
    var value = this.lightVoxels[index];

    if (value > 0 && value < filledWithBlock) {
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
                  var aoValues = this.GetAOValues(
                    _x,
                    _y,
                    _z,
                    "BACK",
                    tmpValues
                  );

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
                  var aoValues = this.GetAOValues(
                    _x,
                    _y,
                    _z,
                    "FRONT",
                    tmpValues
                  );

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
                  var aoValues = this.GetAOValues(
                    _x,
                    _y,
                    _z,
                    "BOTTOM",
                    tmpValues
                  );

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
                  var aoValues = this.GetAOValues(_x, _y, _z, "TOP", tmpValues);

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
                  var aoValues = this.GetAOValues(
                    _x,
                    _y,
                    _z,
                    "LEFT",
                    tmpValues
                  );

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
                  var aoValues = this.GetAOValues(x, _y, z, "RIGHT", tmpValues);

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
        var val =
          this.lightVoxels[
            x +
              this.lightRadius +
              (y + (z + this.lightRadius) * this.height) * this.width
          ];
        tmpValues.push(val == filledWithBlock ? 0 : val);
      }
    }
  }

  return tmpValues;
};

VoxelChunk.prototype.GetAOValues = function (dir, tmpValues) {
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
      noise = new ImprovedPerlin(data.seed * 1);
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
