import bcrypt from 'bcryptjs';
import { pool, withTransaction } from '../src/config/db.js';

const skills = [
  ['JavaScript', 'Web', ['js', 'ecmascript']], ['TypeScript', 'Web', ['ts']],
  ['React', 'Web', ['react.js', 'reactjs']], ['Vue.js', 'Web', ['vue']],
  ['Node.js', 'Backend', ['node', 'nodejs']], ['Express', 'Backend', ['express.js']],
  ['Python', 'Programming', ['py']], ['Java', 'Programming', []], ['C++', 'Programming', ['cpp']],
  ['PostgreSQL', 'Data', ['postgres', 'psql']], ['MySQL', 'Data', []], ['MongoDB', 'Data', ['mongo']],
  ['Redis', 'Data', []], ['REST APIs', 'Backend', ['rest api', 'restful']], ['GraphQL', 'Backend', []],
  ['HTML', 'Web', ['html5']], ['CSS', 'Web', ['css3']], ['Tailwind CSS', 'Web', ['tailwind']],
  ['UI/UX Design', 'Design', ['ui ux', 'ux design', 'product design']], ['Figma', 'Design', []],
  ['Machine Learning', 'AI', ['ml', 'machine-learning']], ['Deep Learning', 'AI', ['dl']],
  ['Natural Language Processing', 'AI', ['nlp']], ['Computer Vision', 'AI', ['cv']],
  ['Data Science', 'Data', ['data analytics']], ['Pandas', 'Data', []], ['NumPy', 'Data', ['numpy']],
  ['TensorFlow', 'AI', ['tensorflow']], ['PyTorch', 'AI', ['pytorch']],
  ['Git', 'DevOps', ['github']], ['Docker', 'DevOps', ['containers']], ['AWS', 'Cloud', ['amazon web services']],
  ['Linux', 'DevOps', []], ['CI/CD', 'DevOps', ['continuous integration']],
  ['Flutter', 'Mobile', []], ['React Native', 'Mobile', ['react-native']], ['Android', 'Mobile', []],
  ['Kotlin', 'Mobile', []], ['Swift', 'Mobile', []], ['Product Management', 'Business', ['pm']],
  ['Project Management', 'Business', []], ['Technical Writing', 'Communication', ['documentation']],
  ['Public Speaking', 'Communication', ['presentations']], ['Research', 'Academic', []],
  ['Cybersecurity', 'Security', ['information security']], ['Blockchain', 'Web3', ['web3']],
  ['Solidity', 'Web3', []], ['Arduino', 'Hardware', []], ['IoT', 'Hardware', ['internet of things']],
  ['Three.js', 'Web', ['threejs']]
];

const people = [
  { college: 'northstar', email: 'isha@northstar.edu', role: 'student', name: 'Isha Mehta', department: 'Computer Science', year: 3, bio: 'Frontend engineer who cares about inclusive interfaces.', interests: ['Climate Tech', 'EdTech'], availability: 12, skills: [['React', 5], ['TypeScript', 4], ['UI/UX Design', 4], ['Figma', 3]] },
  { college: 'northstar', email: 'kabir@northstar.edu', role: 'student', name: 'Kabir Shah', department: 'Data Science', year: 3, bio: 'ML builder interested in practical campus tools.', interests: ['AI for Good', 'HealthTech'], availability: 10, skills: [['Python', 5], ['Machine Learning', 5], ['PostgreSQL', 3], ['Natural Language Processing', 4]] },
  { college: 'northstar', email: 'naina@northstar.edu', role: 'student', name: 'Naina Bose', department: 'Design', year: 2, bio: 'Product designer and researcher turning messy problems into calm workflows.', interests: ['EdTech', 'Civic Tech'], availability: 8, skills: [['UI/UX Design', 5], ['Figma', 5], ['Research', 4], ['Technical Writing', 3]] },
  { college: 'northstar', email: 'arjun@northstar.edu', role: 'owner', name: 'Arjun Rao', department: 'Electronics', year: 4, bio: 'Building hardware-backed sustainability projects.', interests: ['Climate Tech', 'IoT'], availability: 14, skills: [['Node.js', 4], ['PostgreSQL', 4], ['Arduino', 5], ['IoT', 5]] },
  { college: 'riverdale', email: 'zoya@riverdale.edu', role: 'student', name: 'Zoya Khan', department: 'Information Technology', year: 2, bio: 'Backend developer focused on reliable APIs.', interests: ['FinTech', 'Developer Tools'], availability: 9, skills: [['Node.js', 5], ['Express', 4], ['PostgreSQL', 4], ['Docker', 3]] },
  { college: 'riverdale', email: 'dev@riverdale.edu', role: 'owner', name: 'Dev Patel', department: 'Business', year: 4, bio: 'Product lead exploring better student collaboration.', interests: ['EdTech'], availability: 8, skills: [['Product Management', 5], ['Public Speaking', 4], ['Research', 3]] }
];

const projects = [
  { college: 'northstar', owner: 'arjun@northstar.edu', title: 'GreenGrid', description: 'A campus energy dashboard that turns live meter readings into actionable nudges.', domain: 'Climate Tech', size: 4, commitment: 10, days: 42, skills: [['React', 'required'], ['Node.js', 'required'], ['UI/UX Design', 'preferred'], ['Data Science', 'preferred']] },
  { college: 'northstar', owner: 'arjun@northstar.edu', title: 'StudyCircle', description: 'Smart peer study-group formation based on courses, pace, and availability.', domain: 'EdTech', size: 5, commitment: 8, days: 30, skills: [['React', 'required'], ['PostgreSQL', 'required'], ['Machine Learning', 'preferred'], ['Research', 'preferred']] },
  { college: 'riverdale', owner: 'dev@riverdale.edu', title: 'BuildLog', description: 'A lightweight developer journal that helps hackathon teams explain what they built.', domain: 'Developer Tools', size: 3, commitment: 6, days: 25, skills: [['Node.js', 'required'], ['React', 'required'], ['Technical Writing', 'preferred']] },
  { college: 'riverdale', owner: 'dev@riverdale.edu', title: 'PocketPulse', description: 'A friendly student budgeting companion built around weekly spending reflections.', domain: 'FinTech', size: 4, commitment: 7, days: 35, skills: [['React Native', 'required'], ['UI/UX Design', 'required'], ['Product Management', 'preferred']] }
];

async function seed() {
  const passwordHash = await bcrypt.hash('demo1234', 12);

  await withTransaction(async (client) => {
    const collegeBySlug = new Map();
    for (const [name, slug] of [['Northstar Institute of Technology', 'northstar'], ['Riverdale College of Engineering', 'riverdale']]) {
      const { rows: [college] } = await client.query(
        `INSERT INTO colleges (name, slug) VALUES ($1, $2)
         ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id, slug`,
        [name, slug]
      );
      collegeBySlug.set(college.slug, college.id);
    }

    const skillByName = new Map();
    for (const [name, category, aliases] of skills) {
      const { rows: [skill] } = await client.query(
        `INSERT INTO skills (name, category, aliases) VALUES ($1, $2, $3)
         ON CONFLICT (name) DO UPDATE SET category = EXCLUDED.category, aliases = EXCLUDED.aliases
         RETURNING id, name`,
        [name, category, aliases]
      );
      skillByName.set(skill.name, skill.id);
    }

    const userByEmail = new Map();
    for (const person of people) {
      const { rows: [user] } = await client.query(
        `INSERT INTO users (college_id, email, password_hash, role) VALUES ($1, $2, $3, $4)
         ON CONFLICT (email) DO UPDATE SET college_id = EXCLUDED.college_id, role = EXCLUDED.role
         RETURNING id, email`,
        [collegeBySlug.get(person.college), person.email, passwordHash, person.role]
      );
      userByEmail.set(user.email, user.id);
      const { rows: [profile] } = await client.query(
        `INSERT INTO student_profiles (user_id, name, department, year, bio, interests, availability_hours_per_week)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (user_id) DO UPDATE SET name = EXCLUDED.name, department = EXCLUDED.department,
           year = EXCLUDED.year, bio = EXCLUDED.bio, interests = EXCLUDED.interests,
           availability_hours_per_week = EXCLUDED.availability_hours_per_week
         RETURNING id`,
        [user.id, person.name, person.department, person.year, person.bio, person.interests, person.availability]
      );
      await client.query('DELETE FROM student_skills WHERE student_id = $1', [profile.id]);
      for (const [name, proficiency] of person.skills) {
        await client.query(
          'INSERT INTO student_skills (student_id, skill_id, proficiency) VALUES ($1, $2, $3)',
          [profile.id, skillByName.get(name), proficiency]
        );
      }
    }

    for (const project of projects) {
      const { rows: [record] } = await client.query(
        `INSERT INTO projects (college_id, owner_id, title, description, domain, team_size, commitment_hours_per_week, deadline)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW() + ($8 || ' days')::INTERVAL)
         ON CONFLICT DO NOTHING RETURNING id`,
        [collegeBySlug.get(project.college), userByEmail.get(project.owner), project.title, project.description, project.domain, project.size, project.commitment, project.days]
      );
      if (!record) continue;
      for (const [skillName, importance] of project.skills) {
        await client.query(
          'INSERT INTO project_skills (project_id, skill_id, importance) VALUES ($1, $2, $3)',
          [record.id, skillByName.get(skillName), importance]
        );
      }
    }
  });

  console.log('Seed complete. Demo password for all accounts: demo1234');
}

seed()
  .then(() => pool.end())
  .catch(async (error) => {
    console.error(error);
    await pool.end();
    process.exitCode = 1;
  });
