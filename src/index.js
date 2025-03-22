import dotenv from 'dotenv';
import express from 'express';
import mongoose, { connect } from 'mongoose';
import connectDB from './db/db.js';

dotenv.config({path: './env'});



connectDB();
