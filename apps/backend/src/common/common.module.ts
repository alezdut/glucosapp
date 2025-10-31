import { Global, Module } from "@nestjs/common";
import { EncryptionService } from "./services/encryption.service";

/**
 * Common Module
 *
 * Global module providing shared services like encryption
 */
@Global()
@Module({
  providers: [EncryptionService],
  exports: [EncryptionService],
})
export class CommonModule {}
