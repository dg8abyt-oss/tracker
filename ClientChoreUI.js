'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ClientChoreUI({ initialChores }) {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const totalEarned = initialChores.reduce((sum, c) => sum + (c.amount || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !amount) return;
    setLoading(true);

    await fetch('/api/chores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, amount: parseFloat(amount) })
    });

    setTitle('');
    setAmount('');
    setLoading(false);
    router.refresh(); 
  };

  return (
    <div style={{ 
      padding: 'max(env(safe-area-inset-top), 40px) 20px env(safe-area-inset-bottom)', 
      maxWidth: '500px', 
      margin: '0 auto' 
    }}>
      <h1 style={{ fontSize: '34px', fontWeight: '800', letterSpacing: '-0.5px', marginBottom: '24px' }}>
        Chores
      </h1>

      <div style={{ 
        backgroundColor: '#ffffff', 
        borderRadius: '16px', 
        padding: '20px', 
        marginBottom: '24px', 
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)' 
      }}>
        <h2 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '16px', color: '#8e8e93', letterSpacing: '0.5px' }}>
          LOG NEW CHORE
        </h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input
            type="text"
            placeholder="What did you do?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{ 
              padding: '16px', borderRadius: '12px', border: 'none', 
              backgroundColor: '#f2f2f7', fontSize: '17px', outline: 'none' 
            }}
            required
          />
          <input
            type="number"
            step="0.01"
            inputMode="decimal"
            placeholder="Amount Earned ($)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={{ 
              padding: '16px', borderRadius: '12px', border: 'none', 
              backgroundColor: '#f2f2f7', fontSize: '17px', outline: 'none' 
            }}
            required
          />
          <button
            type="submit"
            disabled={loading}
            style={{ 
              marginTop: '8px', padding: '16px', borderRadius: '12px', border: 'none', 
              backgroundColor: '#007aff', color: '#fff', fontSize: '17px', 
              fontWeight: '600', cursor: 'pointer', transition: 'opacity 0.2s',
              opacity: loading ? 0.6 : 1 
            }}
          >
            {loading ? 'Adding...' : 'Add Chore'}
          </button>
        </form>
      </div>

      <div style={{ 
        backgroundColor: '#ffffff', 
        borderRadius: '16px', 
        padding: '20px', 
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)' 
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '13px', fontWeight: '600', color: '#8e8e93', margin: 0, letterSpacing: '0.5px' }}>
            THIS WEEK
          </h2>
          <span style={{ fontSize: '17px', fontWeight: '600', color: '#34c759' }}>
            + ${totalEarned.toFixed(2)}
          </span>
        </div>

        {initialChores.length === 0 ? (
          <p style={{ color: '#8e8e93', textAlign: 'center', margin: '20px 0', fontSize: '15px' }}>
            No chores completed yet.
          </p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {initialChores.map((chore, index) => (
              <li key={chore.id} style={{ 
                display: 'flex', justifyContent: 'space-between', padding: '16px 0', 
                borderBottom: index === initialChores.length - 1 ? 'none' : '0.5px solid #e5e5ea' 
              }}>
                <span style={{ fontSize: '17px', fontWeight: '400', color: '#000' }}>{chore.title}</span>
                <span style={{ fontSize: '17px', color: '#8e8e93' }}>${chore.amount.toFixed(2)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
