// Finds the least squares regression lines for both
// linear and quadratic fits
var MathRegression = {

  //xValues = [1,2,3,4,5]
  //yValues = [1,3,3,4,5]
  linear: function() {
    // y = b1x + b0
    // http://stattrek.com/regression/Regression-Example.aspx?Tutorial=AP
    this.calculate = function(xValues,yValues) {
      var helpers = MathRegression.helpers.vectors;

      this.init(xValues,yValues);
      this.b1 = helpers.sum(this.xlmmultylm) / helpers.sum(this.xlessmean2);
      this.b0 = this.meany - this.b1*this.meanx;
      return [this.b0,this.b1];
    },

    // Coefficient of Determination
    // http://stattrek.com/statistics/dictionary.aspx?definition=Coefficient%20of%20determination
    this.R2 = function() {
      var helpers = MathRegression.helpers.vectors;
      var stddevx = helpers.stdv(this.x);
      var stddevy = helpers.stdv(this.y);
      var N = this.n;

      return Math.pow((1/N) * helpers.sum(this.xlmmultylm) / (stddevx*stddevy),2);
    },

    this.getVal = function(x) {
      return (this.b1 * x) + this.b0;
    },

    this.init = function(xValues,yValues) {
      var helpers = MathRegression.helpers.vectors;
      this.n = xValues.length;
      this.x = xValues;
      this.y = yValues;
      this.sumx = helpers.sum(this.x);
      this.sumy = helpers.sum(this.y);
      this.meanx = helpers.mean(this.x);
      this.meany = helpers.mean(this.y);
      this.xlessmean = helpers.valLessMean(this.x);
      this.ylessmean = helpers.valLessMean(this.y);
      this.xlessmean2 = helpers.valLessMean2(this.x);
      this.ylessmean2 = helpers.valLessMean2(this.y);
      this.xlmmultylm = helpers.mult(this.xlessmean,this.ylessmean);
    },

    // b0b1: a string or array with first val as b0 and second as b1 in the equation
    // b1: if b0b1 is string (b0), then provide b1 as well
    // y = b1x + b0
    this.equation = function(b0b1,b1) {
      var b0 = (b0b1 instanceof Array) ? b0b1[0] : (b0b1 || this.b0);
      b1 = (b0b1 instanceof Array) ? b0b1[1] : (b1 || this.b1);
      return 'y = ' + b1 + 'x + ' + b0;
    }
  },

  //xValues = [1,2,3,4,5]
  //yValues = [1,3,3,4,5]
  quadratic: function() {
    // y = ax^2 + bx + c
    // https://www.easycalculation.com/statistics/learn-quadratic-regression.php
    this.calculate = function(xValues,yValues) {
      this.init(xValues,yValues);
      this.a = ((this.sumx2y*this.sumxx) - (this.sumxy*this.sumxx2)) / ((this.sumxx*this.sumx2x2) - Math.pow(this.sumxx2,2));
      this.b = ((this.sumxy*this.sumx2x2) - (this.sumx2y*this.sumxx2)) / ((this.sumxx*this.sumx2x2) - (Math.pow(this.sumxx2,2)));
      this.c = (this.sumy / this.n) - (this.b*(this.sumx / this.n)) - (this.a * (this.sumx2 / this.n));
      return [this.a,this.b,this.c];
    },

    this.getVal = function(x) {
      return (this.a * Math.pow(x,2)) + (this.b * x) + this.c;
    },

    this.init = function(xValues,yValues) {
      var helpers = MathRegression.helpers.vectors;
      this.n = xValues.length;
      this.x = xValues;
      this.y = yValues;
      this.sumx = helpers.sum(this.x);
      this.sumy = helpers.sum(this.y);
      this.sumxmulty = helpers.sum(helpers.mult(this.x,this.y));
      this.sumx2 = helpers.sum(helpers.pow(this.x,2));
      this.sumy2 = helpers.sum(helpers.pow(this.y,2));
      this.sumx3 = helpers.sum(helpers.pow(this.x,3));
      this.sumy3 = helpers.sum(helpers.pow(this.y,3));
      this.sumx4 = helpers.sum(helpers.pow(this.x,4));
      this.sumx2multy = helpers.sum(helpers.mult(helpers.pow(this.x,2),this.y));

      // special quantities
      this.sumxx = this.sumx2 - (Math.pow(this.sumx,2) / this.n);
      this.sumxy = this.sumxmulty - ((this.sumx * this.sumy) / this.n);
      this.sumxx2 = this.sumx3 - ((this.sumx2 * this.sumx) / this.n);
      this.sumx2y = this.sumx2multy - ((this.sumx2 * this.sumy) / this.n);
      this.sumx2x2 = this.sumx4 - (Math.pow(this.sumx2,2) / this.n);
    },

    this.equation = function(a,b,c) {
      return 'y = ' + a + 'x^2 + ' + b + 'x + ' + c;
    }
  },

  helpers: {
    vectors: {
      sum: function(vector) {
        return vector.reduce(function(a,b) {
          return a+b;
        },0);
      },

      mult: function(vec1,vec2) {
        if (vec1.length !== vec2.length) return false;

        var multAry = [];
        for (var _i=0; _i<vec1.length; _i++) {
          multAry[_i] = vec1[_i] * vec2[_i];
        }
        return multAry;
      },

      pow: function(vector,power) {
        power = Number(power || 2);
        return vector.map(function(val) {
          return Math.pow(val,power);
        })
      },

      mean: function(vector) {
        return this.sum(vector) / vector.length;
      },

      stdv: function(vector) {
        return Math.sqrt(this.sum(this.valLessMean2(vector)) / vector.length);
      },

      valLessMean: function(vector) {
        var mean = this.mean(vector);
        return vector.map(function(val) {
          return val - mean;
        })
      },

      valLessMean2: function(vector) {
        vector = this.valLessMean(vector);
        return vector.map(function(val) {
          return Math.pow(val,2);
        });
      }
    }
  }
}

//-------------------------------------------------------
//NodeJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MathRegression
}
//-------------------------------------------------------
