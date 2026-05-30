const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const defaultCodeCpp = `class Solution {
public:
    int reversePairs(vector<int>& nums) {
        
    }
};`;

const driverCodeCpp = `#include <iostream>
#include <vector>
#include <string>

using namespace std;

int main() {
    string line;
    if (getline(cin, line)) {
        vector<int> nums;
        string current = "";
        for (char c : line) {
            if (isdigit(c) || c == '-') {
                current += c;
            } else if ((c == ',' || c == ']') && !current.empty()) {
                nums.push_back(stoi(current));
                current = "";
            }
        }
        Solution sol;
        cout << sol.reversePairs(nums) << endl;
    }
    return 0;
}`;

async function main() {
  await prisma.codingQuestion.update({
    where: { id: 'cmprb2rz40002upkgv39txim8' },
    data: {
      testCases: JSON.stringify([{input: '[1,3,2,3,1]', output: '2'}, {input: '[2,4,3,5,1]', output: '3'}]),
      defaultCodeCpp,
      driverCodeCpp,
    }
  });
  console.log('Updated Reverse Pairs');
}

main().catch(console.error).finally(() => prisma.$disconnect());
