const test = require('tap').test;
const RateLimiter = require('../../src/util/rateLimiter.js');

test('rate limiter', t => {
    // Create a rate limiter with maximum of 20 sends per second
    const rate = 20;
    const limiter = new RateLimiter(rate);

    // Simulate time passing with a stubbed timer
    let simulatedTime = Date.now();
    limiter._timer = {timeElapsed: () => simulatedTime};

    // The rate limiter starts with a number of tokens equal to the max rate
    t.equal(limiter._count, rate);

    // Running okayToSend a number of times equal to the max rate
    // uses up all of the tokens
    for (let i = 0; i < rate; i++) {
        t.ok(limiter.okayToSend());
        // Tokens are counting down
        t.equal(limiter._count, rate - (i + 1));
    }
    t.notOk(limiter.okayToSend());

    // Advance the timer enough so we get exactly one more token
    // One extra millisecond is required to get over the threshold
    simulatedTime += (1000 / rate) + 1;
    t.ok(limiter.okayToSend());
    t.notOk(limiter.okayToSend());

    t.end();
});
