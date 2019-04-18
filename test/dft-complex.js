'use strict';

var lib = require('../lib');

try {
    var FFT = require('fft.js');
} catch(err) {
    console.log('Nope, the runtime is too old');
    console.log(err);
}

var expect = require('chai').expect;

describe('DFT 4096', function () {
    this.timeout(5000);
    var i,
        inpReal,
        inpImag,
        fn,
        stdlib,
        heap,
        len = 4096,
        compare = function (a, b, label) {
            var i,
                err = 0;

            expect(a.length, label + 'length').to.be.equal(b.length);

            label += ' error:';
            for (i = 0; i < a.length; i++) {
                if (isNaN(a[i])) {
                    console.log(a);
                    return;
                }
                if (isNaN(b[i])) {
                    console.log(b);
                    return;
                }
                err += Math.abs(a[i] - b[i]);
            }
            err /= a.length;
            console.log(label, err);
            expect(err, label).to.be.at.most(0.0000001);
        },
        add = function (a, b) { return a + b; };

    if (typeof window === 'undefined') {
        stdlib = {
            Math: Math,
            Float64Array: Float64Array,
            Float32Array: Float32Array
        };
        if (stdlib.Math.fround === undefined) {
            stdlib.Math.fround = function (n) { return n; };
        }
    } else {
        stdlib = window;
    }

    it('dft, zeros', function (done) {
        var res;

        inpReal = [];
        inpImag = [];
        for (i = 0; i < len; i++) {
            inpReal.push(0);
            inpImag.push(0);
        }

        res = lib.dft(inpReal, inpImag);

        expect(res[0]).to.be.an('array');
        expect(res[1]).to.be.an('array');
        expect(res[0].reduce(add, 0)).to.be.equal(0);
        expect(res[1].reduce(add, 0)).to.be.equal(0);
        done();
    });

    it('idft, zeros', function (done) {
        var res;

        inpReal = [];
        inpImag = [];
        for (i = 0; i < len; i++) {
            inpReal.push(0);
            inpImag.push(0);
        }

        res = lib.idft(inpReal, inpImag);

        compare(res[0], inpReal, 'real');
        compare(res[1], inpImag, 'imag');
        done();
    });

    it('lib.custom, zeros', function (done) {
        inpReal = [];
        inpImag = [];
        for (i = 0; i < len; i++) {
            inpReal.push(0);
            inpImag.push(0);
        }

        lib.fft(inpReal, inpImag);

        expect(inpReal.reduce(add, 0)).to.be.equal(0);
        expect(inpImag.reduce(add, 0)).to.be.equal(0);
        done();
    });

    it('dft, DC = 1', function (done) {
        var res;

        inpReal[0] = 1;

        res = lib.dft(inpReal, inpImag);

        expect(res[0].reduce(add, 0)).to.be.equal(len);
        expect(res[1].reduce(add, 0)).to.be.equal(0);
        done();
    });

    it('random dft / idft', function (done) {
        var res;

        inpReal = [];
        inpImag = [];
        for (i = 0; i < len; i++) {
            inpReal.push(Math.random() - 0.5);
            inpImag.push(Math.random() - 0.5);
        }

        res = lib.dft(inpReal, inpImag);
        res = lib.idft(res[0], res[1]);

        compare(res[0], inpReal, 'real');
        compare(res[1], inpImag, 'imag');
        done();
    });

    it('random fft.js / idft', function (done) {
        try {
            var f = new FFT(len);
            var a = f.createComplexArray();
            var b = f.createComplexArray();
            var re, im, res;

            inpReal = [];
            inpImag = [];
            for (i = 0; i < (2 * len); i += 2) {
                re = Math.random() - 0.5;
                im = Math.random() - 0.5;
                a[i] = re;
                a[i + 1] = im;
                inpReal.push(re);
                inpImag.push(im);
            }

            f.transform(b, a);

            res = [[], []];
            for (i = 0; i < (2 * len); i += 2) {
                res[0].push(b[i]);
                res[1].push(b[i + 1]);
            }

            res = lib.idft(res[0], res[1]);

            compare(res[0], inpReal, 'real');
            compare(res[1], inpImag, 'imag');
        } catch(err) {
            console.log('Nope, the runtime is too old');
            console.log(err);
        }
        done();
    });

    it('random fft / idft', function (done) {
        var res;

        res = [[], []];
        inpReal = [];
        inpImag = [];
        for (i = 0; i < len; i++) {
            inpReal.push(Math.random() - 0.5);
            inpImag.push(Math.random() - 0.5);
            res[0].push(inpReal[i]);
            res[1].push(inpImag[i]);
        }

        lib.fft()(res[0], res[1]);
        res = lib.idft(res[0], res[1]);

        compare(res[0], inpReal, 'real');
        compare(res[1], inpImag, 'imag');
        done();
    });

    it('random fft-f64-raw vs. idft-double', function (done) {
        var refReal,
            refImag,
            real,
            imag,
            res;

        refReal = new Float64Array(len);
        refImag = new Float64Array(len);
        real = new Float64Array(len);
        imag = new Float64Array(len);

        for (i = 0; i < len; i++) {
            real[i] = refReal[i] = Math.random() - 0.5;
            imag[i] = refImag[i] = Math.random() - 0.5;
        }

        heap = lib.custom.alloc(len, 3);

        fn = lib.custom['fft_f64_' + len + '_raw'](stdlib, null, heap);
        fn.init();

        lib.custom.array2heap(real, new Float64Array(heap), len, 0);
        lib.custom.array2heap(imag, new Float64Array(heap), len, len);

        fn.transform();

        lib.custom.heap2array(new Float64Array(heap), real, len, 0);
        lib.custom.heap2array(new Float64Array(heap), imag, len, len);

        res = lib.idft(real, imag);

        compare(res[0], refReal, 'real');
        compare(res[1], refImag, 'imag');
        done();
    });

    it('random fft-f32-raw vs. idft-double', function (done) {
        var refReal,
            refImag,
            real,
            imag,
            res;

        refReal = new Float32Array(len);
        refImag = new Float32Array(len);
        real = new Float32Array(len);
        imag = new Float32Array(len);

        for (i = 0; i < len; i++) {
            real[i] = refReal[i] = Math.random() - 0.5;
            imag[i] = refImag[i] = Math.random() - 0.5;
        }

        heap = lib.custom.alloc(len, 3);

        fn = lib.custom['fft_f32_' + len + '_raw'](stdlib, null, heap);
        fn.init();

        lib.custom.array2heap(real, new Float32Array(heap), len, 0);
        lib.custom.array2heap(imag, new Float32Array(heap), len, len);

        fn.transform();

        lib.custom.heap2array(new Float32Array(heap), real, len, 0);
        lib.custom.heap2array(new Float32Array(heap), imag, len, len);

        res = lib.idft(real, imag);

        compare(res[0], refReal, 'real');
        compare(res[1], refImag, 'imag');
        done();
    });

    it('random lib.custom-f64-asm vs. idft-double', function (done) {
        var refReal,
            refImag,
            real,
            imag,
            res;

        refReal = new Float64Array(len);
        refImag = new Float64Array(len);
        real = new Float64Array(len);
        imag = new Float64Array(len);

        for (i = 0; i < len; i++) {
            real[i] = refReal[i] = Math.random() - 0.5;
            imag[i] = refImag[i] = Math.random() - 0.5;
        }

        heap = lib.custom.alloc(len, 3);

        fn = lib.custom['fft_f64_' + len + '_asm'](stdlib, null, heap);
        fn.init();

        lib.custom.array2heap(real, new Float64Array(heap), len, 0);
        lib.custom.array2heap(imag, new Float64Array(heap), len, len);

        fn.transform();

        lib.custom.heap2array(new Float64Array(heap), real, len, 0);
        lib.custom.heap2array(new Float64Array(heap), imag, len, len);

        res = lib.idft(real, imag);

        compare(res[0], refReal, 'real');
        compare(res[1], refImag, 'imag');
        done();
    });

    it('random fft-f32-asm vs. idft-double', function (done) {
        var refReal,
            refImag,
            real,
            imag,
            res;

        refReal = new Float32Array(len);
        refImag = new Float32Array(len);
        real = new Float32Array(len);
        imag = new Float32Array(len);

        for (i = 0; i < len; i++) {
            real[i] = refReal[i] = Math.random() - 0.5;
            imag[i] = refImag[i] = Math.random() - 0.5;
        }

        heap = lib.custom.alloc(len, 3);

        fn = lib.custom['fft_f32_' + len + '_asm'](stdlib, null, heap);
        fn.init();

        lib.custom.array2heap(real, new Float32Array(heap), len, 0);
        lib.custom.array2heap(imag, new Float32Array(heap), len, len);

        fn.transform();

        lib.custom.heap2array(new Float32Array(heap), real, len, 0);
        lib.custom.heap2array(new Float32Array(heap), imag, len, len);

        res = lib.idft(real, imag);

        compare(res[0], refReal, 'real');
        compare(res[1], refImag, 'imag');
        done();
    });
});

/* eslint no-console: 0 */
