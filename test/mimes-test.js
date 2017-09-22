'use strict';

const helper = require('./support/test-helper');
const mimes = require('../lib/mimes');

describe('mimes', () => {

  let logs = helper.spyLogger();

  it('translates audio formats', () => {
    expect(mimes.audio()).to.equal('application/octet-stream');
    expect(mimes.audio('mp2')).to.equal('audio/mpeg');
    expect(mimes.audio('mp3')).to.equal('audio/mpeg');
    expect(mimes.audio('mpg')).to.equal('audio/mpeg');
    expect(mimes.audio('mpeg')).to.equal('audio/mpeg');
    expect(mimes.audio('mp4')).to.equal('audio/mp4');
    expect(mimes.audio('m4a')).to.equal('audio/mp4');
    expect(logs.warn.length).to.equal(0);
  });

  it('translates video formats', () => {
    expect(mimes.video()).to.equal('application/octet-stream');
    expect(mimes.video('theora')).to.equal('video/ogg');
    expect(mimes.video('vp8')).to.equal('video/webm');
    expect(mimes.video('h264')).to.equal('video/mp4');
    expect(mimes.video('3gp')).to.equal('video/3gpp');
    expect(mimes.video('flv1')).to.equal('video/x-flv');
    expect(mimes.video('mpeg')).to.equal('video/mpeg');
    expect(logs.warn.length).to.equal(0);
  });

  it('warns on unknown audio formats', () => {
    expect(mimes.audio('foobar')).to.equal('audio/foobar');
    expect(logs.warn.length).to.equal(1);
    expect(logs.warn[0]).to.match(/unknown mime audio/i);
  });

  it('warns on unknown audio formats', () => {
    expect(mimes.video('foobar')).to.equal('video/foobar');
    expect(logs.warn.length).to.equal(1);
    expect(logs.warn[0]).to.match(/unknown mime video/i);
  });

});
