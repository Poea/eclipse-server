"use strict";

const uuid = require('node-uuid').v4;
const _ = require('lodash');

const Angle = require('../physics/angle');
const Velocity = require('../physics/velocity');

const PLAYER_SPEED = 5;
const PLAYER_ARMOR = 100;
const PLAYER_RADIAL_SPEED = 0.1;

const actions = {
    defaultPlayer: function(stage, delta, time){
        if (this.isAccelerating){
            this.velocity += PLAYER_SPEED * 0.1;
            if (this.velocity > PLAYER_SPEED){
                this.velocity = PLAYER_SPEED;
            }
        } else {
            this.velocity -= PLAYER_SPEED * 0.025;
            if (this.velocity < 0){
                this.velocity = 0;
            }
        }

        if (this.rotateDirection !== 0){
            this.radialVelocity = Velocity.getRadialVelocity(this.velocity, PLAYER_SPEED, PLAYER_RADIAL_SPEED) * this.rotateDirection;
        } else {
            this.radialVelocity -= PLAYER_RADIAL_SPEED * 0.3;
            if (this.radialVelocity < 0){
                this.radialVelocity = 0;
            }
        }

        if (this.velocity){
            const velocity = Velocity.get2DVelocity(-this.rotation, this.velocity);
            this.x += velocity.x;
            this.y += velocity.y;
        }

        if (this.radialVelocity){
            this.rotation += this.radialVelocity;
        }

        if (this.rotation > Math.PI * 2){
            this.rotation -= Math.PI * 2;
        } else if (this.rotation < -Math.PI * 2){
            this.rotation += Math.PI * 2;
        }
    },
    defaultPlayerDamage: function(projectile, stage){
        this.armor -= projectile.damage;

        if (this.armor <= 0){
            if (this.type === "player-base"){
                this.x = 0;
                this.y = 0;
                this.armor = PLAYER_ARMOR;
            } else {
                stage.removeActorById(this.id);
            }
        }
    }
}

class Actor{
    constructor(options){
        options = options || {};

        this.id = uuid();

        this.x = options.x || 0;
        this.y = options.y || 0;
        this.rotation = options.rotation || 0;

        this.isAccelerating = options.isAccelerating || false;
        this.rotateDirection = options.rotateDirection || 0;

        this.velocity = 0;
        this.vx = options.vx;
        this.vy = options.vy;

        this.ttl = options.ttl || 0;

        this.type = options.type || null;

        this.kind = options.kind || 'actor';

        this.geometry = options.geometry || null;
        this.size = options.size || 0;
        this.createdBy = options.createdBy || null;

        this.armor = options.armor || PLAYER_ARMOR;
        this.maxArmor = options.armor || PLAYER_ARMOR;

        this.setMethod(actions, options, 'onUpdate');
        this.setMethod(actions, options, 'onCollide');
        this.setMethod(actions, options, 'onDamage');
    }

    setMethod(methods, options, name){
        if (typeof options[name] === 'function'){
            this[name] = options[name];
        } else if (typeof options[name] === 'string'){
            this[name] = methods[options[name]];
        }
    }
}

module.exports = Actor;
