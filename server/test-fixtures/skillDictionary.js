// Subset of the seeded skill dictionary (seed/index.js + migration 009),
// including the short, ambiguous aliases ("ts", "cv", "pm") that prose
// matching must ignore.
export const dictionary = [
  { id: 1, name: 'JavaScript', aliases: ['js', 'ecmascript'] },
  { id: 2, name: 'TypeScript', aliases: ['ts'] },
  { id: 3, name: 'React', aliases: ['react.js', 'reactjs'] },
  { id: 4, name: 'Node.js', aliases: ['node', 'nodejs'] },
  { id: 5, name: 'Express', aliases: ['express.js'] },
  { id: 6, name: 'Python', aliases: ['py'] },
  { id: 7, name: 'PostgreSQL', aliases: ['postgres', 'psql'] },
  { id: 8, name: 'Docker', aliases: ['containers'] },
  { id: 9, name: 'Machine Learning', aliases: ['ml', 'machine-learning'] },
  { id: 10, name: 'Computer Vision', aliases: ['cv'] },
  { id: 11, name: 'Product Management', aliases: ['pm'] },
  { id: 12, name: 'Next.js', aliases: ['nextjs', 'next.js'] },
  { id: 13, name: 'Django', aliases: [] },
  { id: 14, name: 'FastAPI', aliases: ['fast api'] },
  { id: 15, name: 'Kubernetes', aliases: ['k8s'] },
  { id: 16, name: 'GitHub Actions', aliases: ['github-actions'] },
  { id: 17, name: 'scikit-learn', aliases: ['sklearn', 'scikit learn'] },
  { id: 18, name: 'PyTorch', aliases: ['pytorch'] },
  { id: 19, name: 'Go', aliases: ['golang'] },
  { id: 20, name: 'Spring Boot', aliases: ['spring-boot', 'springboot'] },
  { id: 21, name: 'Java', aliases: [] },
  { id: 22, name: 'MongoDB', aliases: ['mongo'] },
  { id: 23, name: 'Pandas', aliases: [] }
];
