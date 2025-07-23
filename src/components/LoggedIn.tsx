import React from 'react';
import Layout from './Layout';

interface LoggedInProps {
  name: string;
  email: string;
}

export default function LoggedIn({ name, email }: LoggedInProps) {
  return (
    <Layout title="Lotus Calendar - Logged In">
      <div className="container">
        <h1>Welcome, {name}!</h1>
        <p>You are logged in as: {email}</p>
        <a 
          className="logout-btn"
          href="/logout"
        >
          Logout
        </a>
      </div>
    </Layout>
  );
} 