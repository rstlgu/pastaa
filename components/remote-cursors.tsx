"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Avatar } from "./ui/avatar";

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
        
        return (
          <motion.div
            key={user.id}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ 
              opacity: 1, 
              scale: 1,
            }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed pointer-events-none z-[60] flex items-center gap-2"
            style={{
              left: `${user.cursor.x}px`,
              top: `${user.cursor.y - 10}px`, // Offset per posizionare sopra il cursore
              transform: 'translate(-50%, -100%)',
            }}
          >
            <Avatar
              src={user.avatar}
              alt={user.name}
              fallback={user.name.charAt(0)}
              className="h-5 w-5 border-2 border-primary"
            />
            <div className="bg-primary text-primary-foreground px-2 py-1 rounded text-xs font-medium shadow-lg whitespace-nowrap">
              {user.name}
            </div>
          </motion.div>
        );
      })}
    </AnimatePresence>
  );
}

