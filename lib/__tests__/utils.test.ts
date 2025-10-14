import {
    bytesToSize,
    pluralize,
    debounce,
    parseAttributes,
} from '../utils';

describe('bytesToSize', () => {
    test.each([
        [0, 'n/a'],
        [1, '1 Bytes'],
        [2000, '1.95 KiB'],
        [30000, '29.30 KiB'],
        [400000, '390.63 KiB'],
        [5000000, '4.77 MiB'],
        [60000000, '57.22 MiB'],
        [700000000, '667.57 MiB'],
        [8000000000, '7.45 GiB'],
        [90000000000, '83.82 GiB'],
        [100000000000, '93.13 GiB'],
        [1100000000000, '1.00 TiB'],
        [12000000000000, '10.91 TiB'],
        [130000000000000, '118.23 TiB'],
        [1400000000000000, '1273.29 TiB'],
        [15000000000000000, '13642.42 TiB'],
    ])('.bytesToSize(%p)', (
        val: number,
        expected: string,
    ) => {
        expect(
            bytesToSize(val),
        ).toBe(expected);
    });

    test.each([
        [1024, 0, '1 KiB'],
        [1024, 3, '1.000 KiB'],
        [12345, 5, '12.05566 KiB'],
    ])('.bytesToSize(%p, %p)', (val: number, decimals: number, expected: string) => {
        expect(bytesToSize(val, decimals)).toBe(expected);
    });
});

describe('pluralize', () => {
    test.each([
        [1, 'apple', 'apple'],
        [0, 'apple', 'apples'],
        [2, 'apple', 'apples'],
        [1, 'cherry', 'cherry'],
        [0, 'cherry', 'cherries'],
        [2, 'cherry', 'cherries'],
        [1, 'box', 'box'],
        [0, 'box', 'boxes'],
        [2, 'box', 'boxes'],
        [1, 'potato', 'potato'],
        [0, 'potato', 'potatoes'],
        [2, 'potato', 'potatoes'],
        [1, 'bus', 'bus'],
        [0, 'bus', 'buses'],
        [2, 'bus', 'buses'],
        [1, 'watch', 'watch'],
        [0, 'watch', 'watches'],
        [2, 'watch', 'watches'],
        [1, 'man', 'man'],
        [0, 'man', 'men'],
        [2, 'man', 'men'],
        [1, 'woman', 'woman'],
        [0, 'woman', 'women'],
        [2, 'woman', 'women'],
        [1, 'child', 'child'],
        [0, 'child', 'children'],
        [2, 'child', 'children'],
        [1, 'tooth', 'tooth'],
        [0, 'tooth', 'teeth'],
        [2, 'tooth', 'teeth'],
        [1, 'foot', 'foot'],
        [0, 'foot', 'feet'],
        [2, 'foot', 'feet'],
        [1, 'mouse', 'mouse'],
        [0, 'mouse', 'mice'],
        [2, 'mouse', 'mice'],
        [1, 'goose', 'goose'],
        [0, 'goose', 'geese'],
        [2, 'goose', 'geese'],
        [1, 'piano', 'piano'],
        [0, 'piano', 'pianos'],
        [2, 'piano', 'pianos'],
    ])('.pluralize(%p, %p)', (
        count: number,
        word: string,
        expected: string,
    ) => {
        expect(
            pluralize(count, word),
        ).toBe(expected);
    });
});

describe('debounce', () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('should debounce function calls', async () => {
        const mockFunction = jest.fn();
        const debouncedFunction = debounce(mockFunction, 100);

        debouncedFunction();
        debouncedFunction();
        debouncedFunction();

        jest.runAllTimers();

        await Promise.resolve();  // This is to allow any pending promises to resolve

        expect(mockFunction).toHaveBeenCalledTimes(1);
    });

    it('should not call functions early', async () => {
        const mockFn = jest.fn();
        const debouncedFn = debounce(mockFn, 1000);

        debouncedFn();
        expect(mockFn).not.toHaveBeenCalled();

        jest.advanceTimersByTime(500);
        expect(mockFn).not.toHaveBeenCalled();

        jest.advanceTimersByTime(500);
        expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should delay the function call when we call the function again', async () => {
        const mockFn = jest.fn();
        const debouncedFn = debounce(mockFn, 1000);

        debouncedFn();
        expect(mockFn).not.toHaveBeenCalled();

        jest.advanceTimersByTime(500);
        expect(mockFn).not.toHaveBeenCalled();

        // This should reset the timer
        debouncedFn();

        jest.advanceTimersByTime(500);
        expect(mockFn).not.toHaveBeenCalled();

        jest.advanceTimersByTime(500);
        expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should pass the correct arguments to the debounced function', async () => {
        const mockFunction = jest.fn();
        const debouncedFunction = debounce(mockFunction, 100);

        debouncedFunction('arg1', 'arg2');

        jest.runAllTimers();

        await Promise.resolve();  // This is to allow any pending promises to resolve

        expect(mockFunction).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('should resolve with the correct value', async () => {
        const mockFunction = jest.fn().mockReturnValue('result');
        const debouncedFunction = debounce(mockFunction, 100);

        const promise = debouncedFunction();
        jest.runAllTimers();

        const result = await promise;
        expect(result).toBe('result');
    });
});

describe('parseAttributes', () => {
    test('should parse attributes correctly', () => {
        const input = 'id="myId" class="myClass" data-value="123"';
        const expected = {
            id: 'myId',
            class: 'myClass',
            'data-value': '123',
        };

        expect(parseAttributes(input)).toEqual(expected);
    });

    test('should handle empty input', () => {
        const input = '';
        const expected = {};

        expect(parseAttributes(input)).toEqual(expected);
    });

    test('should handle attributes with special characters', () => {
        const input = 'data-name="John Doe" data-age="30"';
        const expected = {
            'data-name': 'John Doe',
            'data-age': '30',
        };

        expect(parseAttributes(input)).toEqual(expected);
    });

    test('should handle attributes with multiple hyphens', () => {
        const input = 'data-long-attribute-name="value" another-attr="test"';
        const expected = {
            'data-long-attribute-name': 'value',
            'another-attr': 'test',
        };

        expect(parseAttributes(input)).toEqual(expected);
    });
});
