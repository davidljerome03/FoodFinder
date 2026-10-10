import { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';

export default function Game() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [votedId, setVotedId] = useState(null);

  const restaurants = [
    {
      id: '1',
      name: 'Taco Loco',
      cuisines: ['Mexican', 'Tacos'],
      price: '$$',
      rating: 4.8,
      reviews: 286,
      image: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?auto=format&fit=crop&q=80&w=1000'
    },
    {
      id: '2',
      name: 'Burger Joint',
      cuisines: ['American', 'Burgers'],
      price: '$$',
      rating: 4.5,
      reviews: 412,
      image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=1000'
    },
    {
      id: '3',
      name: 'Sushi Zen',
      cuisines: ['Japanese', 'Sushi'],
      price: '$$$',
      rating: 4.9,
      reviews: 156,
      image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&q=80&w=1000'
    }
  ];

  const handleVote = (id) => {
    setVotedId(id);
    // Simulate everyone voting and transitioning to winner screen
    setTimeout(() => {
      navigate(`/winner/${roomCode}`, { state: location.state });
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-background text-navy-900 font-sans p-6">
      {/* Header */}
      <header className="flex justify-between items-center mb-12">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-navy-900 rounded-lg flex items-center justify-center text-white font-bold">FF</div>
          <div>
            <h1 className="text-xl font-bold leading-none">food finder</h1>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 border-2 border-navy-900 rounded-full px-4 py-1.5 bg-white">
            <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></div>
            <span className="text-xs font-bold font-mono tracking-wider uppercase">Voting Live</span>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto text-center mb-12">
        <div className="text-xs font-mono font-bold tracking-widest uppercase text-navy-900/60 mb-4">
          Round 1 / 1
        </div>
        <h1 className="text-5xl font-bold tracking-tight mb-4">Cast your vote.</h1>
        <p className="text-xl text-navy-900/80">Tap the restaurant you want to eat at the most.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto px-4">
        {restaurants.map(restaurant => (
          <button
            key={restaurant.id}
            onClick={() => handleVote(restaurant.id)}
            disabled={votedId !== null}
            className={`text-left flex flex-col bg-card border-2 rounded-3xl overflow-hidden transition-all duration-300
              ${votedId === restaurant.id 
                ? 'border-orange-500 shadow-[8px_8px_0px_0px_rgba(255,90,54,1)] translate-x-[-4px] translate-y-[-4px]' 
                : votedId !== null 
                  ? 'border-navy-900 opacity-50 grayscale'
                  : 'border-navy-900 shadow-[4px_4px_0px_0px_rgba(28,46,53,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(28,46,53,1)]'
              }
            `}
          >
            <div className="h-64 w-full bg-gray-200 relative">
              <img 
                src={restaurant.image} 
                alt={restaurant.name} 
                className="w-full h-full object-cover"
              />
              {votedId === restaurant.id && (
                <div className="absolute inset-0 bg-orange-500/20 flex items-center justify-center backdrop-blur-sm">
                  <div className="bg-orange-500 text-navy-900 font-bold px-6 py-3 rounded-full border-2 border-navy-900 text-xl shadow-[4px_4px_0px_0px_rgba(28,46,53,1)] rotate-[-10deg]">
                    Voted!
                  </div>
                </div>
              )}
            </div>
            <div className="p-6 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-2">
                  <h2 className="text-2xl font-bold">{restaurant.name}</h2>
                  <span className="text-xl font-bold tracking-widest">{restaurant.price}</span>
                </div>
                <p className="text-sm font-bold text-navy-900/60 mb-4">
                  {restaurant.cuisines.join(' • ')} / {restaurant.rating} ★ ({restaurant.reviews})
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
