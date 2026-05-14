import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, Users, Star, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export type Recipe = {
  id: string;
  title: string;
  description: string;
  image: string;
  prepTime: string;
  servings: number;
  rating: number;
  author: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
};

const RecipeCard = ({ recipe }: { recipe: Recipe }) => {
  return (
    <motion.div
      whileHover={{ y: -10 }}
      className="bg-white rounded-[2rem] overflow-hidden border border-stone-100 shadow-sm hover:shadow-2xl transition-all group"
    >
      <div className="relative h-64 overflow-hidden">
        <img 
          src={recipe.image} 
          alt={recipe.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
        />
        <div className="absolute top-4 left-4 z-10">
          <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-md border ${
            recipe.difficulty === 'Easy' ? 'bg-green-500/20 text-green-100 border-green-500/30' :
            recipe.difficulty === 'Medium' ? 'bg-orange-500/20 text-orange-100 border-orange-500/30' :
            'bg-red-500/20 text-red-100 border-red-500/30'
          }`}>
            {recipe.difficulty}
          </span>
        </div>
      </div>

      <div className="p-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1 text-amber-500">
            <Star size={16} fill="currentColor" />
            <span className="font-bold text-secondary">{recipe.rating}</span>
          </div>
          <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">By {recipe.author}</span>
        </div>

        <h3 className="text-2xl font-serif font-bold text-secondary mb-4 group-hover:text-primary transition-colors">
          {recipe.title}
        </h3>
        
        <p className="text-muted mb-6 line-clamp-2 font-light">
          {recipe.description}
        </p>

        <div className="flex items-center gap-6 mb-8 pt-6 border-t border-stone-50">
          <div className="flex items-center gap-2 text-stone-500">
            <Clock size={18} className="text-primary" />
            <span className="text-sm font-semibold">{recipe.prepTime}</span>
          </div>
          <div className="flex items-center gap-2 text-stone-500">
            <Users size={18} className="text-primary" />
            <span className="text-sm font-semibold">{recipe.servings} Guests</span>
          </div>
        </div>

        <Link 
          to={`/recipe/${recipe.id}`}
          className="w-full flex items-center justify-center gap-2 bg-stone-900 text-white py-4 rounded-2xl font-bold hover:bg-primary transition-all group/btn"
        >
          View Recipe 
          <ArrowRight size={18} className="group-hover/btn:translate-x-1 transition-transform" />
        </Link>
      </div>
    </motion.div>
  );
};

export default RecipeCard;
