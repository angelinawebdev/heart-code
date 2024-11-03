var settings = {
    particles: {
        length: 500,
        duration: 2,
        velocity: 150,
        effect: -0.75,
        size: 30,
    },
    flowers: 50, // Number of flowers
    trail: {
        length: 100, // Number of trail particles
        duration: 1, // Duration for trail particles
        velocity: 30 // Speed of trail particles
    }
};

var mousePosition = { x: 0, y: 0 };

(function() {
    var b = 0;
    var c = ["ms", "moz", "webkit", "o"];
    for (var a = 0; a < c.length && !window.requestAnimationFrame; ++a) {
        window.requestAnimationFrame = window[c[a] + "RequestAnimationFrame"];
        window.cancelAnimationFrame = window[c[a] + "CancelAnimationFrame"] || window[c[a] + "CancelRequestAnimationFrame"];
    }
    if (!window.requestAnimationFrame) {
        window.requestAnimationFrame = function(h, e) {
            var d = new Date().getTime();
            var f = Math.max(0, 16 - (d - b));
            var g = window.setTimeout(function() { h(d + f); }, f);
            b = d + f;
            return g;
        };
    }
    if (!window.cancelAnimationFrame) {
        window.cancelAnimationFrame = function(d) {
            clearTimeout(d);
        };
    }
})();

var Point = (function() {
    function Point(x, y) {
        this.x = (typeof x !== 'undefined') ? x : 0;
        this.y = (typeof y !== 'undefined') ? y : 0;
    }
    Point.prototype.clone = function() {
        return new Point(this.x, this.y);
    };
    Point.prototype.length = function(length) {
        if (typeof length === 'undefined')
            return Math.sqrt(this.x * this.x + this.y * this.y);
        this.normalize();
        this.x *= length;
        this.y *= length;
        return this;
    };
    Point.prototype.normalize = function() {
        var length = this.length();
        if (length !== 0) {
            this.x /= length;
            this.y /= length;
        }
        return this;
    };
    return Point;
})();

var Particle = (function() {
    function Particle() {
        this.position = new Point();
        this.velocity = new Point();
        this.age = 0;
    }
    Particle.prototype.initialize = function(x, y, dx, dy) {
        this.position.x = x;
        this.position.y = y;
        this.velocity.x = dx;
        this.velocity.y = dy;
        this.age = 0;
    };
    Particle.prototype.update = function(deltaTime) {
        this.position.x += this.velocity.x * deltaTime;
        this.position.y += this.velocity.y * deltaTime;
        this.age += deltaTime;
    };
    Particle.prototype.draw = function(context, image) {
        function ease(t) {
            return (-t) * t * t + 1;
        }
        var size = image.width * ease(this.age / settings.particles.duration);
        context.globalAlpha = 1 - this.age / settings.particles.duration;
        context.drawImage(image, this.position.x - size / 2, this.position.y - size / 2, size, size);
    };
    return Particle;
})();

var ParticlePool = (function() {
    var particles, firstActive = 0, firstFree = 0, duration;

    function ParticlePool(length) {
        particles = new Array(length);
        for (var i = 0; i < particles.length; i++)
            particles[i] = new Particle();
        duration = settings.particles.duration;
    }
    ParticlePool.prototype.add = function(x, y, dx, dy) {
        particles[firstFree].initialize(x, y, dx, dy);
        firstFree++;
        if (firstFree === particles.length) firstFree = 0;
        if (firstActive === firstFree) firstActive++;
        if (firstActive === particles.length) firstActive = 0;
    };
    ParticlePool.prototype.update = function(deltaTime) {
        var i;
        if (firstActive < firstFree) {
            for (i = firstActive; i < firstFree; i++)
                particles[i].update(deltaTime);
        }
        if (firstFree < firstActive) {
            for (i = firstActive; i < particles.length; i++)
                particles[i].update(deltaTime);
            for (i = 0; i < firstFree; i++)
                particles[i].update(deltaTime);
        }
        while (particles[firstActive].age >= duration && firstActive !== firstFree) {
            firstActive++;
            if (firstActive === particles.length) firstActive = 0;
        }
    };
    ParticlePool.prototype.draw = function(context, image) {
        if (firstActive < firstFree) {
            for (i = firstActive; i < firstFree; i++)
                particles[i].draw(context, image);
        }
        if (firstFree < firstActive) {
            for (i = firstActive; i < particles.length; i++)
                particles[i].draw(context, image);
            for (i = 0; i < firstFree; i++)
                particles[i].draw(context, image);
        }
    };
    return ParticlePool;
})();

(function(canvas) {
    var context = canvas.getContext('2d');
    var flowerPools = [];
    var flowerImages = [];
    var trailPool = new ParticlePool(settings.trail.length);
    var particleRate = settings.particles.length / settings.particles.duration;
    var time;

    // Point function for flower shape
    function pointOnFlower(t) {
        var r = 100 * (1 + 0.3 * Math.sin(6 * t));
        return new Point(
            r * Math.cos(t),
            r * Math.sin(t)
        );
    }

    // Create flower images
    function createFlowerImage() {
        var flowerCanvas = document.createElement('canvas');
        var flowerContext = flowerCanvas.getContext('2d');
        flowerCanvas.width = settings.particles.size;
        flowerCanvas.height = settings.particles.size;

        function to(t) {
            var point = pointOnFlower(t);
            point.x = settings.particles.size / 2 + point.x * settings.particles.size / 200;
            point.y = settings.particles.size / 2 - point.y * settings.particles.size / 200;
            return point;
        }

        flowerContext.beginPath();
        for (var t = 0; t <= 2 * Math.PI; t += 0.01) {
            var point = to(t);
            flowerContext.lineTo(point.x, point.y);
        }
        flowerContext.closePath();
        flowerContext.fillStyle = '#afc0a3';
        flowerContext.fill();

        var image = new Image();
        image.src = flowerCanvas.toDataURL();
        return image;
    }

    // Create particle pools and images for each flower
    for (var i = 0; i < settings.flowers; i++) {
        flowerImages.push(createFlowerImage());
        flowerPools.push(new ParticlePool(settings.particles.length));
    }

    // Mouse move event listener
    canvas.addEventListener('mousemove', function(event) {
        mousePosition.x = event.clientX - canvas.getBoundingClientRect().left;
        mousePosition.y = event.clientY - canvas.getBoundingClientRect().top;

        // Create trail effect
        var angle = Math.random() * 2 * Math.PI;
        var speed = Math.random() * settings.trail.velocity;
        var dir = new Point(Math.cos(angle) * speed, Math.sin(angle) * speed);
        trailPool.add(mousePosition.x, mousePosition.y, dir.x, dir.y);
    });

    // Mouse click event listener for blooming effect
    canvas.addEventListener('click', function() {
        for (var j = 0; j < settings.flowers; j++) {
            var flowerRate = particleRate * (0.5 + Math.random() * 1.5);
            for (var i = 0; i < flowerRate * 5; i++) {
                var angle = Math.random() * 2 * Math.PI;
                var speed = Math.random() * settings.particles.velocity;
                var dir = new Point(Math.cos(angle) * speed, Math.sin(angle) * speed);
                flowerPools[j].add(mousePosition.x, mousePosition.y, dir.x, dir.y);
            }
        }
    });

    function render() {
        requestAnimationFrame(render);
        var newTime = new Date().getTime() / 1000;
        var deltaTime = newTime - (time || newTime);
        time = newTime;

        context.clearRect(0, 0, canvas.width, canvas.height);

        // Update and draw trail particles
        trailPool.update(deltaTime);
        trailPool.draw(context, flowerImages[0]); // Use a generic image for trail

        // Update and draw flower particles
        for (var j = 0; j < settings.flowers; j++) {
            var flowerPool = flowerPools[j];
            flowerPool.update(deltaTime);
            flowerPool.draw(context, flowerImages[j]);
        }
    }

    function onResize() {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
    }

    window.onresize = onResize;

    setTimeout(function() {
        onResize();
        render();
    }, 10);
})(document.getElementById('pinkboard'));
