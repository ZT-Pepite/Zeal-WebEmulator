/**
 * SPDX-FileCopyrightText: 2022-2023 Zeal 8-bit Computer <contact@zeal8bit.com>
 *
 * SPDX-License-Identifier: Apache-2.0
 */

 function ROM(Zeal) {
    const zeal = Zeal;
    const size = 256*KB;
    const from = 0x00_0000;
    const to = 0x08_0000;

    /* If we are emulating the SST39 NOR flash, write/erase is supported */
    const emulate_sst39 = true;
    var erasing = false;
    var writing = false;
    var software_id = false;
    /* Byte being currently written */
    var writing_byte = 0;
    var previous_write = [];

    var data = new Array(size);

    for (var i = 0; i < size; i++) {
        data[i] = 0xFF;
    }

    function _base64ToArrayBuffer(base64) {
        const binary_string = atob(base64);
        const len = binary_string.length;
        const bytes = new Uint8Array(len);
        for (var i = 0; i < len; i++) {
            bytes[i] = binary_string.charCodeAt(i);
        }
        return bytes;
    }

    /**
     * Accept both a string or an array as "binary" data
     */
    function loadFile(binary) {
        if (typeof binary === "string") {
            for (var i = 0; i < binary.length; i++)
                data[i] = binary.charCodeAt(i);
        } else {
            for (var i = 0; i < binary.length; i++)
                data[i] = binary[i];
        }
    }

    function is_valid_address(read, address) {
        /* Only accept writes if we are emulating the SST39 Flash */
        return (read || emulate_sst39) && address >= from && address < to;
    }

    function is_valid_port(read, port) {
        return false;
    }

    function mem_read(address) {
        console.assert (address >= from && address < to, "Wrong read address for ROM");
        /* On real hardware, the upper addresses (bigger than ROM) are a mirror of the
         * lower part, reproduce the same scheme here too. */
        address &= (size - 1);
        if (erasing) {
            /* TODO: Check read-during-erase on real hardware */
            return 0xFF;
        } else if (writing) {
            /* DQ7 has already been flipped before programming the write */
            const ret = writing_byte;
            /* Bit 6 must be flipped here */
            writing_byte ^= 0x40;
            return ret;
        } else if (software_id) {
            /**
             * On address 0, return SST Manufacturer's ID: 0xBF
             * On address 1, return the Device ID: 0xB6 (SST39SF020)
             */
            if (address == 0) return 0xBF;
            if (address == 1) return 0xB6;
            /* TODO: Verify on real hardware the behavior here */
            return 0xFF;
        }
        return data[address];
    }

    function mem_write(address, value) {
        console.assert (address >= from && address < to, "Wrong write address for ROM");
        console.assert(emulate_sst39, "Write is only supported with SST39 emulation");
        /* Same reasons as explained in the read function */
        address &= (size - 1);
        /* Make sure we aren't already erasing or writing a byte */
        if (writing || erasing) {
            /* Nothing */
            return;
        }

        if (check_and_perform_erase(address, value) ||
            check_and_perform_write(address, value) ||
            check_and_perform_software_id(address, value)) {
            previous_write = [];
        } else {
            previous_write.push({ address, value });
            /* In practice, the case where we will have the most transaction is an erase, we will have
             * to check the previous five transactions. So if we have more than that, drop the oldest. */
            if (previous_write.length > 6) {
                previous_write.shift();
            }
        }
    }

    /**
     * Check if the previous transactions describe a sector-erase.
     * If they do, an erase is performed and this function returns true, else returns false
     */
    function check_and_perform_erase(address, value) {
        const length = previous_write.length;
        const last = length - 1;
        if (!software_id && value == 0x30 && length > 4 &&
            transactions_equal(previous_write[last - 0], { address : 0x2aaa, value : 0x55 }) &&
            transactions_equal(previous_write[last - 1], { address : 0x5555, value : 0xaa }) &&
            transactions_equal(previous_write[last - 2], { address : 0x5555, value : 0x80 }) &&
            transactions_equal(previous_write[last - 3], { address : 0x2aaa, value : 0x55 }) &&
            transactions_equal(previous_write[last - 4], { address : 0x5555, value : 0xaa })
        ) {
            /* Erase sector transaction!
             * Get the corresponding 4KB-sector to erase out of the 22-bit address */
            const sector = address & 0x3ff000;
            erasing = true;
            console.log("Erasing FLASH");
            /* Erasing a sector takes 25ms on real hardware, register a callback to actually reflect this */
            zeal.registerTstateCallback(() => {
                for (var i = 0 ; i< 4096; i++)
                    data[i + sector] = 0xff;
                erasing = false;
            }, us_to_tstates(25000));
            return true;
        }

        /* Not a valid erase sequence */
        return false;
    }


    /**
     * Check if the previous transactions describe a write-byte sequence.
     * If they do, a write/program is performed and this function returns true, else returns false
     */
     function check_and_perform_write(address, value) {
        const length = previous_write.length;
        const last = previous_write.length - 1;
        if (!software_id && length > 2 &&
            transactions_equal(previous_write[last - 0], { address : 0x5555, value : 0xa0 }) &&
            transactions_equal(previous_write[last - 1], { address : 0x2aaa, value : 0x55 }) &&
            transactions_equal(previous_write[last - 2], { address : 0x5555, value : 0xaa })
        ) {
            /* Byte-program transaction. Make sure the byte is erased before trying to write it */
            if (data[address] != 0xFF) {
                /* Return false directly else */
                return false;
            }
            /* The byte being written must have bit 7 flipped, DQ6 must be toggled at each read */
            writing_byte = value ^ 0x80;
            writing = true;
            console.log("Writing byte to FLASH");
            /* Writing a byte takes 20us on real hardware, register a callback to actually reflect this */
            zeal.registerTstateCallback(() => {
                data[address] = value;
                writing = false;
                writing_byte = 0;
            }, us_to_tstates(20));
            return true;
        }

        /* Not a valid write sequence */
        return false;
    }

    /**
     * Check if we are performing a Software ID Entry or Exit
     * Returns true is that's the case, false else.
     */
    function check_and_perform_software_id(address, value) {
        const last = previous_write.length - 1;
        if (!software_id && address == 0x5555 && value == 0x90 && previous_write.length > 1 &&
            transactions_equal(previous_write[last - 0], { address : 0x2aaa, value : 0x55 }) &&
            transactions_equal(previous_write[last - 1], { address : 0x5555, value : 0xaa }))
        {
            /* Software ID entry */
            software_id = true;
            return true;
        } else if (software_id && value == 0xF0) {
            /* Software ID exit */
            software_id = false;
            return true;
        }

        return false;
    }


    function transactions_equal(transaction1, transaction2) {
        return transaction1.address == transaction2.address &&
               transaction1.value == transaction2.value;
    }

    function io_read(port) {
        console.assert(false, "IO read on ROM impossible");
        return 0;
    }

    function io_write(port, value) {
        console.assert(false, "IO write on ROM impossible");
    }

    function dumpToFile() {
        const array = new Uint8Array(data);
        const blob = new Blob([array], { type: "octet/stream" });
        const url = window.URL.createObjectURL(blob);
        $("#dump-link").attr("href", url);
        $("#dump-link")[0].click();
        window.URL.revokeObjectURL(url);
    }

    $("#dump-button").click(dumpToFile);

    this.is_valid_address = is_valid_address;
    this.is_valid_port = is_valid_port;
    this.mem_read = mem_read;
    this.mem_write = mem_write;
    this.io_read = io_read;
    this.io_write = io_write;
    this.loadFile = loadFile;
    this.dumpToFile = dumpToFile;
}
