import React from 'react';
import { User, Mail, Phone, Code, Sparkles } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="app-footer">
      <div className="footer-content">
        <div className="footer-brand">
          <div className="footer-title">
            <Code size={18} className="text-primary" />
            <span>TicketStream MERN</span>
          </div>
          <p className="footer-desc">
            High-Performance 800k Record Processing &bull; Real-Time Streaming Architecture
          </p>
        </div>

        <div className="footer-developer">
          <div className="developer-tag">
            <Sparkles size={14} className="accent-icon" />
            <span>Developer Details</span>
          </div>
          <div className="developer-info-grid">
            <div className="dev-item">
              <User size={15} className="dev-icon" />
              <span className="dev-label">Name:</span>
              <span className="dev-val name-highlight">Sayan Dutta</span>
            </div>
            <a href="mailto:sayandutta83@gmail.com" className="dev-item dev-link" title="Send email to Sayan Dutta">
              <Mail size={15} className="dev-icon" />
              <span className="dev-label">Email:</span>
              <span className="dev-val">sayandutta83@gmail.com</span>
            </a>
            <a href="tel:8906367874" className="dev-item dev-link" title="Call Sayan Dutta">
              <Phone size={15} className="dev-icon" />
              <span className="dev-label">Phone:</span>
              <span className="dev-val">8906367874</span>
            </a>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <span>&copy; {new Date().getFullYear()} TicketStream MERN. Developed by Sayan Dutta.</span>
      </div>
    </footer>
  );
}
