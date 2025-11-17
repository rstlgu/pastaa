"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";
import { generateUserColor, generateUserColorDark } from "@/lib/generate-user-color";

interface User {
  id: string;
  name: string;
  avatar: string;
  cursor?: { x: number; y: number };
  selection?: { start: number; end: number };
}

interface RemoteCursorsProps {
  users: User[];
}

export function RemoteCursors({ users }: RemoteCursorsProps) {
  return (
    <AnimatePresence>
      {users.map((user) => {
        if (!user.cursor) return null;
        
        const userColor = generateUserColor(user.id);
        const userColorDark = generateUserColorDark(user.id);
        
        return (
          <motion.div
            key={user.id}
            initial={{ opacity: 0 }}
            animate={{ 
              opacity: 1,
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed pointer-events-none z-[60]"
            style={{
              left: `${user.cursor.x}px`,
              top: `${user.cursor.y}px`,
            }}
          >
            {/* Cursore reale */}
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                transform: 'translate(-2px, -2px)',
              }}
            >
              <path
                d="M3 3L10.07 19.97L12.58 12.58L19.97 10.07L3 3Z"
                fill={userColor}
                stroke={userColorDark}
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
            
            {/* Avatar e nome accanto al cursore */}
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2, delay: 0.1 }}
              className="flex items-center gap-2 ml-6 mt-2"
            >
              <Avatar className="h-6 w-6 border-2" style={{ borderColor: userColor }}>
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback 
                  style={{ backgroundColor: userColor, color: '#fff' }}
                >
                  {user.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div
                className="px-2 py-1 rounded text-xs font-medium shadow-lg whitespace-nowrap"
                style={{
                  backgroundColor: userColor,
                  color: '#fff',
                }}
              >
                {user.name}
              </div>
            </motion.div>
          </motion.div>
        );
      })}
    </AnimatePresence>
  );
}
