import express from 'express';
import { PrismaClient } from '@prisma/client';
import { google } from 'googleapis';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const port = process.env.PORT || 5000;

// OAuth 2.0 credentials
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = 'https://developers.google.com/oauthplayground';
const REFRESH_TOKEN = process.env.REFRESH_TOKEN;

// Create OAuth2 client
const oAuth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI
);

// Set the refresh token
oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

// Nodemailer transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        type: 'OAuth2',
        user: process.env.GMAIL_USER,
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
        refreshToken: REFRESH_TOKEN,
        accessToken: oAuth2Client.getAccessToken(),
    },
});
app.use(cors());
app.use(express.json());

// POST endpoint for submitting a referral
app.post('/referrals', async (req, res) => {
    const { referrerName, referrerEmail, refereeEmail, program } = req.body;

    try {
        // Save referral to database
        const newReferral = await prisma.referral.create({
            data: {
                referrerName,
                referrerEmail,
                refereeEmail,
                program,
            },
        });

        // Send referral email
        const mailOptions = {
            from: 'your_email@gmail.com',
            to: refereeEmail,
            subject: 'You have been referred!',
            text: `Dear ${referrerName}, you have been referred to ${program}.`,
        };

        // Send email using transporter
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.log(error);
                res.status(500).send('Error sending referral email');
            } else {
                console.log('Email sent: ' + info.response);
                res.status(200).send('Referral submitted successfully');
            }
        });
    } catch (error) {
        console.error('Error submitting referral:', error);
        res.status(500).send('Error submitting referral');
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
