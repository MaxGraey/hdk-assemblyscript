import "allocator/tlsf";
import { allocateUnsafe, copyUnsafe, HEADER_SIZE } from "internal/string"
import { ErrorCode, debug } from "./index"

@inline
export function u32_high_bits(encoded_allocation: u32): u16 {
  // right shift and explicit type cast it
  return <u16>(encoded_allocation >> 16);
}


@inline
export function u32_low_bits(encoded_allocation: u32): u16 {
  // type cast and remainder
  return encoded_allocation as u16;
}

// offset, length
@inline
export function u32_merge_bits(high: u16, low: u16): u32 {
  // left shift, bitwise or
  return <u32>high << 16 | <u32>low;
}


export function check_encoded_allocation(encoded_allocation: u32): ErrorCode {
  let offset = u32_high_bits(encoded_allocation);
  let length = u32_low_bits(encoded_allocation);
  if (!length) {
    return offset as ErrorCode;
  }
  // switch to u32 from u16
  let u32offset = offset as u32;
  let u32length = length as u32;
  let max = u16.MAX_VALUE as u32;
  if ((u32offset + u32length) > max) {
    return ErrorCode.PageOverflowError;
  }
  return ErrorCode.Success;
}


// writes string to memory, then returns encoded allocation ref
export function serialize(val: string): u32 {
  let dataLength = val.length;
  // each char takes two bytes, encoded
  let ptr = memory.allocate(dataLength << 1);
  //checkMem();
  for (let i = 0; i < dataLength; ++i) {
    store<u16>(ptr + i, val.charCodeAt(i));
  }
  let encoded_allocation = u32_merge_bits(ptr, dataLength);
  return encoded_allocation;
}


// reads a string into a new memory allocation that uses the format for asm
export function deserialize(encoded_allocation: u32): string {
  let offset = u32_high_bits(encoded_allocation) as usize;
  let length = u32_low_bits(encoded_allocation);
  let res    = allocateUnsafe(length) as usize;
  for (let i = 0; i < length; ++i) {
    store<u16>(res + (i << 1), <u16>load<u8>(offset + i), HEADER_SIZE);
  }
  return res as string;
}


export function free(ptr: u32): void {
  if (ptr) memory.free(ptr);
}


export function errorCodeToString(code: ErrorCode): string {
  switch (code) {
    case ErrorCode.Success:
      return "Success";
    case ErrorCode.Failure:
      return "Failure";
    case ErrorCode.ArgumentDeserializationFailed:
      return "Argument Deserialization Failed";
    case ErrorCode.OutOfMemory:
      return "OutOfMemory";
    case ErrorCode.ReceivedWrongActionResult:
      return "Received Wrong Action Result";
    case ErrorCode.CallbackFailed:
      return "Callback Failed";
    case ErrorCode.RecursiveCallForbidden:
      return "Recursive Call Forbidden";
    case ErrorCode.ResponseSerializationFailed:
      return "Response Serialization Failed";
    case ErrorCode.PageOverflowError:
      return "Page Overflow Error";
    default:
      return "Unknown Error";
  }
}
