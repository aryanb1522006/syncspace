// skillNormalization.js
//
// Maps raw technology names found in external evidence (GitHub language
// names, package names, repository topics, LinkedIn skill labels) onto the
// SyncSpace skill dictionary.
//
// Matching is EXACT after normalization - an alias always names the same
// technology ("JS" -> JavaScript, "React.js" -> React). Related but
// different technologies ("Next.js" vs "React", "PostgreSQL" vs "SQL")
// are deliberately NOT merged here; semanticSkillMatching.js already
// surfaces them as "related" at recommendation time without claiming the
// student has the other skill.

// Raw name -> canonical dictionary skill name, for names whose dictionary
// entry does not already list them as an alias. Package names are only
// listed when the package IS the technology (react-dom is React; an ORM
// such as sequelize is not proof of a specific database).
const CANONICAL = new Map(Object.entries({
  js: 'JavaScript', javascript: 'JavaScript', ecmascript: 'JavaScript',
  ts: 'TypeScript', typescript: 'TypeScript',
  react: 'React', 'react-dom': 'React', reactjs: 'React', 'react.js': 'React',
  next: 'Next.js', nextjs: 'Next.js', 'next.js': 'Next.js',
  vue: 'Vue.js', vuejs: 'Vue.js',
  express: 'Express', expressjs: 'Express',
  node: 'Node.js', nodejs: 'Node.js', 'node.js': 'Node.js',
  three: 'Three.js', threejs: 'Three.js',
  'react-native': 'React Native',
  tailwindcss: 'Tailwind CSS', tailwind: 'Tailwind CSS',
  graphql: 'GraphQL', '@apollo/client': 'GraphQL', '@apollo/server': 'GraphQL', 'apollo-server': 'GraphQL',
  pg: 'PostgreSQL', postgres: 'PostgreSQL', postgresql: 'PostgreSQL', psycopg: 'PostgreSQL',
  psycopg2: 'PostgreSQL', 'psycopg2-binary': 'PostgreSQL', asyncpg: 'PostgreSQL', 'org.postgresql:postgresql': 'PostgreSQL',
  mysql: 'MySQL', mysql2: 'MySQL', pymysql: 'MySQL', mysqlclient: 'MySQL', 'mysql-connector-python': 'MySQL',
  mongodb: 'MongoDB', mongoose: 'MongoDB', pymongo: 'MongoDB', mongo: 'MongoDB',
  redis: 'Redis', ioredis: 'Redis',
  '@tensorflow/tfjs': 'TensorFlow', tensorflow: 'TensorFlow', 'tensorflow-cpu': 'TensorFlow', 'tensorflow-gpu': 'TensorFlow',
  torch: 'PyTorch', pytorch: 'PyTorch',
  'scikit-learn': 'scikit-learn', sklearn: 'scikit-learn',
  pandas: 'Pandas', numpy: 'NumPy',
  django: 'Django', flask: 'Flask', fastapi: 'FastAPI',
  'spring-boot': 'Spring Boot', 'org.springframework.boot:spring-boot-starter': 'Spring Boot',
  'org.springframework.boot:spring-boot-starter-web': 'Spring Boot',
  docker: 'Docker', dockerfile: 'Docker', kubernetes: 'Kubernetes', k8s: 'Kubernetes',
  'github-actions': 'GitHub Actions',
  'c++': 'C++', cpp: 'C++', c: 'C', go: 'Go', golang: 'Go', rust: 'Rust', python: 'Python', java: 'Java',
  kotlin: 'Kotlin', swift: 'Swift', dart: 'Dart', flutter: 'Flutter', solidity: 'Solidity',
  html: 'HTML', html5: 'HTML', css: 'CSS', css3: 'CSS',
  'machine-learning': 'Machine Learning', 'deep-learning': 'Deep Learning',
  'natural-language-processing': 'Natural Language Processing', nlp: 'Natural Language Processing',
  'computer-vision': 'Computer Vision', arduino: 'Arduino', iot: 'IoT', blockchain: 'Blockchain'
}));

export const normalizeKey = (value) => String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

/**
 * Builds a resolver over the skill dictionary rows ({ id, name, aliases }).
 * resolve(raw) returns the dictionary skill or null when the technology
 * is not in the dictionary.
 */
export function createSkillResolver(dictionary) {
  const byKey = new Map();
  for (const skill of dictionary) {
    for (const candidate of [skill.name, ...(skill.aliases ?? [])]) {
      const key = normalizeKey(candidate);
      if (key && !byKey.has(key)) byKey.set(key, skill);
    }
  }

  return function resolve(raw) {
    const key = normalizeKey(raw);
    if (!key) return null;
    const canonical = CANONICAL.get(key);
    if (canonical) return byKey.get(normalizeKey(canonical)) ?? null;
    // Topic-style names: "machine-learning" -> "machine learning".
    return byKey.get(key) ?? byKey.get(key.replace(/[-_]/g, ' ')) ?? null;
  };
}

/**
 * Free-text dictionary for README / LinkedIn prose. Names and aliases
 * shorter than three characters ("cv", "pm", "ts", "Go", "C") are dropped
 * because in prose they usually mean something else (a resume, a time,
 * the English verb ...). Structured sources still match them exactly.
 */
export function proseDictionary(dictionary) {
  return dictionary
    .filter((skill) => skill.name.trim().length >= 3)
    .map((skill) => ({ ...skill, aliases: (skill.aliases ?? []).filter((alias) => alias.trim().length >= 3) }));
}
