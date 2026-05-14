import React from 'react';
import { Link } from 'react-router-dom';
import { Instagram, Facebook, Twitter, Mail, MapPin, Phone } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-stone-900 text-white pt-20 pb-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          {/* Brand Section */}
          <div className="space-y-6">
            <Link to="/" className="flex items-center gap-2">
              <span className="text-3xl font-serif font-bold text-primary">DineOps</span>
            </Link>
            <p className="text-stone-400 leading-relaxed">
              Transforming the dining experience with modern technology. 
              Find the best tables, discover new recipes, and manage your restaurant seamlessly.
            </p>
            <div className="flex items-center gap-4">
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-stone-800 flex items-center justify-center hover:bg-primary transition-colors">
                <Instagram size={20} />
              </a>
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-stone-800 flex items-center justify-center hover:bg-primary transition-colors">
                <Facebook size={20} />
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-stone-800 flex items-center justify-center hover:bg-primary transition-colors">
                <Twitter size={20} />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-bold mb-6">Quick Links</h4>
            <ul className="space-y-4 text-stone-400">
              <li><Link to="/explore" className="hover:text-primary transition-colors">Find a Table</Link></li>
              <li><Link to="/recipes" className="hover:text-primary transition-colors">Recipes</Link></li>
              <li><Link to="/register" className="hover:text-primary transition-colors">List Your Restaurant</Link></li>
              <li><Link to="/login" className="hover:text-primary transition-colors">Staff Login</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-lg font-bold mb-6">Support</h4>
            <ul className="space-y-4 text-stone-400">
              <li><a href="#" className="hover:text-primary transition-colors">Help Center</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Contact Us</a></li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-lg font-bold mb-6">Contact</h4>
            <ul className="space-y-4 text-stone-400">
              <li className="flex items-start gap-3">
                <MapPin className="text-primary shrink-0" size={18} />
                <span>123 Culinary Ave, Foodie District, Mumbai, India</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="text-primary shrink-0" size={18} />
                <span>+91 98765 43210</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="text-primary shrink-0" size={18} />
                <span>hello@dineops.com</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-stone-800 flex flex-col md:flex-row justify-between items-center gap-4 text-stone-500 text-sm">
          <p>© {new Date().getFullYear()} DineOps. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link to="/privacy" className="hover:text-stone-300">Privacy</Link>
            <Link to="/terms" className="hover:text-stone-300">Terms</Link>
            <Link to="/cookies" className="hover:text-stone-300">Cookies</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
