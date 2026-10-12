// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @title Cbor
/// @notice The few RFC 8949 deterministic-encoding writers SignCell addressing needs, plus a
///         well-formedness walker. SignCell's content address is sha256 of the canonical CBOR of
///         a carrier (`semiotic-content-address`); this is the EVM half of that encoder.
/// @dev Only definite-length items are written or accepted. Heads are always the shortest form,
///      which is what RFC 8949 section 4.2.1 requires of deterministic encoding. Map-key order
///      is the caller's responsibility (SignCell fixes it by hand for its three fixed shapes).
library Cbor {
    error ValueTooLarge();

    uint8 internal constant MAJOR_UINT = 0;
    uint8 internal constant MAJOR_NEGINT = 1;
    uint8 internal constant MAJOR_BYTES = 2;
    uint8 internal constant MAJOR_TEXT = 3;
    uint8 internal constant MAJOR_ARRAY = 4;
    uint8 internal constant MAJOR_MAP = 5;
    uint8 internal constant MAJOR_TAG = 6;
    uint8 internal constant MAJOR_SIMPLE = 7;

    /// @notice The shortest-form initial byte(s) for a major type and argument.
    function head(uint8 major, uint64 arg) internal pure returns (bytes memory) {
        uint8 m = major << 5;
        if (arg < 24) return abi.encodePacked(bytes1(m | uint8(arg)));
        if (arg <= type(uint8).max) return abi.encodePacked(bytes1(m | 24), uint8(arg));
        if (arg <= type(uint16).max) return abi.encodePacked(bytes1(m | 25), uint16(arg));
        if (arg <= type(uint32).max) return abi.encodePacked(bytes1(m | 26), uint32(arg));
        return abi.encodePacked(bytes1(m | 27), arg);
    }

    function _len(uint256 n) private pure returns (uint64) {
        if (n > type(uint64).max) revert ValueTooLarge();
        return uint64(n);
    }

    /// @notice A text string item. The caller owns NFC normalisation: the JS carrier NFC-normalises
    ///         every string, so a non-NFC input here is a different (unreachable) cell, not an error.
    function text(bytes memory utf8) internal pure returns (bytes memory) {
        return abi.encodePacked(head(MAJOR_TEXT, _len(utf8.length)), utf8);
    }

    function text(string memory s) internal pure returns (bytes memory) {
        return text(bytes(s));
    }

    /// @notice A byte string item (major type 2).
    function bytesItem(bytes memory b) internal pure returns (bytes memory) {
        return abi.encodePacked(head(MAJOR_BYTES, _len(b.length)), b);
    }

    /// @notice A non-negative integer item, as the JS carrier writes every safe integer >= 0.
    function uintItem(uint64 n) internal pure returns (bytes memory) {
        return head(MAJOR_UINT, n);
    }

    function boolItem(bool b) internal pure returns (bytes memory) {
        return abi.encodePacked(bytes1(b ? 0xf5 : 0xf4));
    }

    function nullItem() internal pure returns (bytes memory) {
        return hex"f6";
    }

    function arrayHead(uint256 count) internal pure returns (bytes memory) {
        return head(MAJOR_ARRAY, _len(count));
    }

    function mapHead(uint256 pairs) internal pure returns (bytes memory) {
        return head(MAJOR_MAP, _len(pairs));
    }

    /// @notice Whether `data` is exactly one well-formed, definite-length CBOR data item.
    /// @dev This is what makes SignCell term concatenation injective: with every term a single
    ///      self-delimiting item, the bytes of a cell identify (subject, predicate, object) uniquely
    ///      and nobody can smuggle a predicate into a subject. It does not check canonical form
    ///      (a non-canonical term merely names a cell no canonical encoder reaches).
    function isSingleItem(bytes memory data) internal pure returns (bool) {
        uint256 pos;
        uint256 need = 1; // data items still to be read
        uint256 n = data.length;
        while (need > 0) {
            if (pos >= n) return false;
            uint8 ib = uint8(data[pos]);
            unchecked {
                ++pos;
            }
            uint8 major = ib >> 5;
            uint8 info = ib & 0x1f;
            uint256 arg;
            if (info < 24) {
                arg = info;
            } else if (info <= 27) {
                uint256 width = uint256(1) << (info - 24);
                if (pos + width > n) return false;
                for (uint256 i; i < width; ++i) {
                    arg = (arg << 8) | uint8(data[pos + i]);
                }
                pos += width;
            } else {
                return false; // reserved or indefinite-length
            }
            if (major == MAJOR_UINT || major == MAJOR_NEGINT) {
                --need;
            } else if (major == MAJOR_BYTES || major == MAJOR_TEXT) {
                if (arg > n - pos) return false;
                pos += arg;
                --need;
            } else if (major == MAJOR_ARRAY) {
                need = need - 1 + arg;
            } else if (major == MAJOR_MAP) {
                need = need - 1 + 2 * arg;
            } else if (major == MAJOR_TAG) {
                // the tagged content is the next item; `need` is unchanged
            } else {
                // simple values and floats: the argument bytes were consumed above
                if (info == 24 && arg < 32) return false; // two-byte simple value must be >= 32
                --need;
            }
        }
        return pos == n;
    }
}
