-- Smaller uploads fit Workers Free CPU; old/imported ciphertext retains its original chunk layout.
DROP TRIGGER File_budget_insert;
DROP TRIGGER File_budget_delete;
DROP TRIGGER Chunk_ticket;
DROP TRIGGER Paste_attach;
DROP TRIGGER Paste_delete_files;
DROP TRIGGER Paste_burn_files;
CREATE TABLE File_new (
 id TEXT PRIMARY KEY, purpose TEXT NOT NULL CHECK(purpose IN('chat','paste')), parentId TEXT,
 channelHash TEXT, mimeType TEXT NOT NULL, extension TEXT NOT NULL, plainSize INTEGER NOT NULL CHECK(plainSize BETWEEN 1 AND 10485760),
 size INTEGER NOT NULL CHECK(size BETWEEN 17 AND 13981100), chunks INTEGER NOT NULL CHECK(chunks BETWEEN 1 AND 128),
 layers INTEGER NOT NULL CHECK(layers IN(1,2)), readTokenHash TEXT NOT NULL, uploadTokenHash TEXT NOT NULL,
 ready INTEGER NOT NULL DEFAULT 0 CHECK(ready IN(0,1)), burn INTEGER NOT NULL DEFAULT 0, consumed INTEGER NOT NULL DEFAULT 0,
 transferTokenHash TEXT, expiresInMs INTEGER NOT NULL, expiresAt INTEGER NOT NULL, createdAt INTEGER NOT NULL,
 storedBytes INTEGER NOT NULL CHECK(storedBytes > 0),
 chunkBytes INTEGER NOT NULL DEFAULT 524288 CHECK(chunkBytes IN(131072,524288))
);
CREATE TABLE FileChunk_new (
 fileId TEXT NOT NULL REFERENCES File_new(id) ON DELETE CASCADE, ordinal INTEGER NOT NULL CHECK(ordinal BETWEEN 0 AND 127),
 content TEXT NOT NULL CHECK(length(content)<=699052), bytes INTEGER NOT NULL CHECK(bytes BETWEEN 1 AND 524288),
 digest TEXT NOT NULL CHECK(length(digest)=64), PRIMARY KEY(fileId,ordinal)
) WITHOUT ROWID;
INSERT INTO File_new SELECT *,524288 FROM File;
INSERT INTO FileChunk_new SELECT * FROM FileChunk;
DROP TABLE FileChunk;
DROP TABLE File;
ALTER TABLE File_new RENAME TO File;
ALTER TABLE FileChunk_new RENAME TO FileChunk;
CREATE INDEX File_expiry ON File(expiresAt);
CREATE INDEX File_parent ON File(parentId);
CREATE TRIGGER File_budget_insert AFTER INSERT ON File BEGIN UPDATE StorageBudget SET used=used+NEW.storedBytes WHERE id=1; END;
CREATE TRIGGER File_budget_delete AFTER DELETE ON File BEGIN UPDATE StorageBudget SET used=used-OLD.storedBytes WHERE id=1; END;
-- A chunk may only be inserted into its live upload ticket. A racing commit cannot append/replace data.
CREATE TRIGGER Chunk_ticket BEFORE INSERT ON FileChunk BEGIN
 SELECT RAISE(ABORT,'invalid_upload_ticket') WHERE NOT EXISTS (SELECT 1 FROM File f WHERE f.id=NEW.fileId AND f.ready=0 AND f.expiresAt>unixepoch('now')*1000 AND NEW.ordinal<f.chunks AND NEW.bytes=MIN(f.chunkBytes,f.size-NEW.ordinal*f.chunkBytes));
END;
CREATE TRIGGER Paste_attach AFTER INSERT ON Paste BEGIN
 SELECT RAISE(ABORT,'invalid_attachments') WHERE EXISTS (
 SELECT 1 FROM json_each(NEW.encryptedFiles) j LEFT JOIN File f ON f.id=json_extract(j.value,'$.fileId')
 WHERE f.id IS NULL OR f.ready!=1 OR f.parentId IS NOT NULL OR f.purpose!='paste' OR f.expiresAt<=unixepoch('now')*1000
 OR f.readTokenHash!=json_extract(j.value,'$.readTokenHash') OR f.plainSize!=json_extract(j.value,'$.size') OR f.layers!=NEW.hasPassword+1
 );
 UPDATE File SET parentId=NEW.id,expiresAt=NEW.expiresAt,burn=NEW.burnAfterReading WHERE id IN (SELECT json_extract(value,'$.fileId') FROM json_each(NEW.encryptedFiles));
END;
CREATE TRIGGER Paste_delete_files AFTER DELETE ON Paste WHEN OLD.burnAfterReading=0 OR OLD.expiresAt<=unixepoch('now')*1000 BEGIN
 DELETE FROM File WHERE parentId=OLD.id;
END;
CREATE TRIGGER Paste_burn_files AFTER DELETE ON Paste WHEN OLD.burnAfterReading=1 AND OLD.expiresAt>unixepoch('now')*1000 BEGIN
 -- The winning reader has 120 seconds to transfer ciphertext. Each downloaded file is deleted immediately afterwards.
 UPDATE File SET burn=1,expiresAt=MIN(expiresAt,unixepoch('now')*1000+120000) WHERE parentId=OLD.id;
END;
