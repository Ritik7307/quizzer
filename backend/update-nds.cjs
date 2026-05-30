const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const defaultCodeCpp = `class Solution {
public:
    vector<vector<int>> findSubsequences(vector<int>& nums) {
        
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
        vector<vector<int>> res = sol.findSubsequences(nums);
        cout << "[";
        for (size_t i = 0; i < res.size(); i++) {
            cout << "[";
            for (size_t j = 0; j < res[i].size(); j++) {
                cout << res[i][j];
                if (j < res[i].size() - 1) cout << ",";
            }
            cout << "]";
            if (i < res.size() - 1) cout << ",";
        }
        cout << "]" << endl;
    }
    return 0;
}`;

async function main() {
  try {
    const res = await prisma.codingQuestion.update({
      where: { id: 'cmprb2o2t0000upkgivgb3dhf' },
      data: {
        defaultCodeCpp,
        driverCodeCpp,
      }
    });
    console.log('Successfully updated Non-decreasing Subsequences!');
  } catch (err) {
    console.error('Failed to update. Make sure your local .env DATABASE_URL points to your production database.');
    console.error(err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
