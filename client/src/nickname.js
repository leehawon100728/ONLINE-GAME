const ADJECTIVES = ['즐거운', '용감한', '느긋한', '엉뚱한', '똑똑한', '날쌘', '수줍은', '든든한', '반짝이는', '엉큼한'];
const ANIMALS = ['여우', '다람쥐', '고양이', '펭귄', '너구리', '토끼', '수달', '부엉이', '판다', '햄스터'];

export function generateNickname() {
  const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  const number = Math.floor(Math.random() * 90) + 10;
  return `${adjective}${animal}${number}`;
}
