import { PROFILES } from "../../assets/profiles"
const postsdata = [
  {
    creator: 'Alice James', timago: '2h', id: 1, title: 'My Life is Important', description: 'I was almost killed on my way to the village!', color: '#515151', engagements: { likes: 0, comments: 1.1, shares: 233, saves: 712 },
    avata: PROFILES.alicejames, likers: [],
  },

  {
    creator: 'Joseph Peter', timago: '16h', id: 2, title: 'Understanding Relationship', description: 'This is the only way to protect your relationship', color: '#f58787',
    engagements: { likes: 0, comments: 11, shares: 14, saves: 3 },
    avata: PROFILES.josephpeter, likers: []
  },

  {
    creator: 'Albert Tom', timago: '2d', id: 3, title: 'Confront Your Enemies', description: 'The reason why you are still under your enemy is because you dont want to die', color: '#87c0f5',
    engagements: { likes: 0, comments: 433, shares: 34, saves: 12 },
    avata: PROFILES.alberttom, likers: []
  },
]
export default postsdata
