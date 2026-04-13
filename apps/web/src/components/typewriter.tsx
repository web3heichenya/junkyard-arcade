'use client';

import * as React from 'react';
import { motion } from 'framer-motion';

export function TypewriterText({
  text,
  delay = 0,
  className,
}: {
  text: string;
  delay?: number;
  className?: string;
}) {
  const characters = Array.from(text);

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-10%' }}
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: 0.03,
            delayChildren: delay,
          },
        },
      }}
    >
      {characters.map((char, index) => (
        <motion.span
          key={index}
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1 },
          }}
        >
          {char}
        </motion.span>
      ))}
    </motion.div>
  );
}
