import { useEffect, useState } from 'react';
import { Alert, FlatList, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../constants/colors';
import { API } from '../services/api';

export default function GroupsScreen() {
  const [groupName, setGroupName] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [members, setMembers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [billModalVisible, setBillModalVisible] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [billDescription, setBillDescription] = useState('');
  const [billAmount, setBillAmount] = useState('');
  const [selectedBill, setSelectedBill] = useState(null);

  // In a real app, get this from authentication context
  const userId = 'dummyuser123';
  const userEmail = 'user@example.com'; // This should come from your auth system

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const response = await API.get(`/groups/user/${userId}`);
      setGroups(response.data);
    } catch (err) {
      console.error('Failed to fetch groups', err);
      Alert.alert('Error', 'Failed to fetch groups. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

  const handleAddMember = () => {
    const trimmedEmail = memberEmail.trim().toLowerCase();
    
    if (!trimmedEmail) {
      Alert.alert('Error', 'Please enter an email address');
      return;
    }

    if (!validateEmail(trimmedEmail)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address');
      return;
    }

    if (trimmedEmail === userEmail.toLowerCase()) {
      Alert.alert('Error', 'You cannot add yourself as a member');
      return;
    }

    if (members.includes(trimmedEmail)) {
      Alert.alert('Duplicate Member', 'This member is already added');
      return;
    }

    setMembers([...members, trimmedEmail]);
    setMemberEmail('');
    Alert.alert('Success', 'Member added successfully!');
  };

  const removeMember = (emailToRemove) => {
    setMembers(members.filter(email => email !== emailToRemove));
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }

    if (members.length === 0) {
      Alert.alert('Error', 'Please add at least one member');
      return;
    }

    try {
      setLoading(true);
      
      // Add the creator to the members list
      const allMembers = [...members, userEmail.toLowerCase()];
      
      const response = await API.post('/groups', {
        name: groupName.trim(),
        members: allMembers,
        createdBy: userId,
        bills: [],
        createdAt: new Date().toISOString(),
      });

      setGroupName('');
      setMembers([]);
      await fetchGroups();
      Alert.alert('Success', 'Group created successfully! Invitation emails have been sent to all members.');
    } catch (err) {
      console.error('Failed to create group', err);
      const errorMessage = err.response?.data?.error || 'Failed to create group. Please try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBill = async () => {
    if (!billDescription.trim()) {
      Alert.alert('Error', 'Please enter a bill description');
      return;
    }

    if (!billAmount.trim()) {
      Alert.alert('Error', 'Please enter the bill amount');
      return;
    }

    const amount = parseFloat(billAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount greater than 0');
      return;
    }

    try {
      setLoading(true);
      
      const response = await API.post(`/groups/${selectedGroup._id}/bills`, {
        description: billDescription.trim(),
        totalAmount: amount,
        createdBy: userId,
      });

      setBillDescription('');
      setBillAmount('');
      setBillModalVisible(false);
      await fetchGroups();
      Alert.alert('Success', 'Bill created and split among members! Notification emails have been sent.');
    } catch (err) {
      console.error('Failed to create bill', err);
      const errorMessage = err.response?.data?.error || 'Failed to create bill. Please try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkPaid = async (billId, memberEmail) => {
    try {
      setLoading(true);
      
      await API.patch(`/groups/${selectedGroup._id}/bills/${billId}/payment`, {
        memberEmail,
        paid: true,
        paidAt: new Date().toISOString(),
      });

      await fetchGroups();
      
      // Update the selected group to reflect changes in the modal
      const updatedGroup = groups.find(g => g._id === selectedGroup._id);
      if (updatedGroup) {
        setSelectedGroup(updatedGroup);
      }
      
      Alert.alert('Success', 'Payment marked as paid!');
    } catch (err) {
      console.error('Failed to mark payment', err);
      const errorMessage = err.response?.data?.error || 'Failed to update payment status';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const sendReminder = async (billId, memberEmail) => {
    try {
      setLoading(true);
      
      const bill = selectedGroup.bills.find(b => b._id === billId);
      const payment = bill?.payments?.find(p => p.memberEmail === memberEmail);
      
      if (!bill || !payment) {
        Alert.alert('Error', 'Bill or payment information not found');
        return;
      }

      await API.post(`/groups/${selectedGroup._id}/bills/${billId}/reminder`, {
        memberEmail,
        billDescription: bill.description,
        amount: payment.amount,
      });

      Alert.alert('Success', 'Payment reminder sent successfully!');
    } catch (err) {
      console.error('Failed to send reminder', err);
      const errorMessage = err.response?.data?.error || 'Failed to send reminder';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const sendBulkReminders = async () => {
    if (!selectedGroup || !selectedGroup.bills) return;

    try {
      setLoading(true);
      let remindersSent = 0;
      
      for (const bill of selectedGroup.bills) {
        const unpaidPayments = bill.payments.filter(p => !p.paid);
        
        for (const payment of unpaidPayments) {
          await API.post(`/groups/${selectedGroup._id}/bills/${bill._id}/reminder`, {
            memberEmail: payment.memberEmail,
            billDescription: bill.description,
            amount: payment.amount,
          });
          remindersSent++;
        }
      }
      
      Alert.alert('Success', `${remindersSent} payment reminders sent successfully!`);
    } catch (err) {
      console.error('Failed to send bulk reminders', err);
      Alert.alert('Error', 'Failed to send some reminders. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const calculateGroupSummary = (group) => {
    const totalBills = group.bills?.length || 0;
    const totalAmount = group.bills?.reduce((sum, bill) => sum + bill.totalAmount, 0) || 0;
    const pendingPayments = group.bills?.reduce((sum, bill) => {
      return sum + bill.payments.filter(p => !p.paid).length;
    }, 0) || 0;
    
    return { totalBills, totalAmount, pendingPayments };
  };

  const renderGroupItem = ({ item }) => {
    const summary = calculateGroupSummary(item);
    
    return (
      <View style={styles.groupItem}>
        <Text style={styles.groupName}>{item.name}</Text>
        <Text style={styles.memberCount}>👥 {item.members?.length || 0} members</Text>
        <Text style={styles.billCount}>📋 {summary.totalBills} bills</Text>
        <Text style={styles.totalAmount}>💰 ${summary.totalAmount.toFixed(2)} total</Text>
        {summary.pendingPayments > 0 && (
          <Text style={styles.pendingPayments}>
            ⚠️ {summary.pendingPayments} pending payments
          </Text>
        )}

        <View style={styles.groupActions}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: COLORS.primary }]}
            onPress={() => {
              setSelectedGroup(item);
              setBillModalVisible(true);
            }}
          >
            <Text style={styles.actionBtnText}>Add Bill</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#28a745' }]}
            onPress={() => {
              setSelectedGroup(item);
              setPaymentModalVisible(true);
            }}
          >
            <Text style={styles.actionBtnText}>View Bills</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderBillItem = ({ item }) => {
    const paidCount = item.payments.filter(p => p.paid).length;
    const totalCount = item.payments.length;
    const allPaid = paidCount === totalCount;
    
    return (
      <View style={[styles.billItem, allPaid && styles.billItemPaid]}>
        <View style={styles.billHeader}>
          <Text style={styles.billDescription}>{item.description}</Text>
          <Text style={styles.billStatus}>
            {allPaid ? '✅ Completed' : `${paidCount}/${totalCount} paid`}
          </Text>
        </View>
        
        <Text style={styles.billAmount}>Total: ${item.totalAmount.toFixed(2)}</Text>
        <Text style={styles.splitAmount}>Split: ${item.splitAmount.toFixed(2)} per person</Text>
        <Text style={styles.billDate}>
          Created: {new Date(item.createdAt).toLocaleDateString()}
        </Text>

        <View style={styles.paymentsContainer}>
          <Text style={styles.paymentsHeader}>Payment Status:</Text>
          {item.payments.map((payment, index) => (
            <View key={index} style={styles.paymentRow}>
              <Text style={styles.memberEmail}>{payment.memberEmail}</Text>
              <Text style={[
                styles.paymentStatus,
                { color: payment.paid ? '#28a745' : '#dc3545' }
              ]}>
                {payment.paid ? '✓ Paid' : '✗ Pending'}
              </Text>
              <Text style={styles.paymentAmount}>
                ${payment.amount.toFixed(2)}
              </Text>

              {!payment.paid && (
                <View style={styles.paymentActions}>
                  <TouchableOpacity
                    style={[styles.smallBtn, { backgroundColor: '#28a745' }]}
                    onPress={() => handleMarkPaid(item._id, payment.memberEmail)}
                    disabled={loading}
                  >
                    <Text style={styles.smallBtnText}>Mark Paid</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.smallBtn, { backgroundColor: '#ffc107' }]}
                    onPress={() => sendReminder(item._id, payment.memberEmail)}
                    disabled={loading}
                  >
                    <Text style={styles.smallBtnText}>Remind</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.heading}>Create New Group</Text>

      <TextInput
        placeholder="Group Name (e.g., 'Weekend Trip', 'Office Lunch')"
        value={groupName}
        onChangeText={setGroupName}
        style={styles.input}
        editable={!loading}
      />

      <View style={styles.row}>
        <TextInput
          placeholder="Add Member Email"
          value={memberEmail}
          onChangeText={setMemberEmail}
          style={[styles.input, { flex: 1, marginRight: 10 }]}
          keyboardType="email-address"
          autoCapitalize="none"
          editable={!loading}
        />
        <TouchableOpacity 
          onPress={handleAddMember} 
          style={[styles.addBtn, loading && styles.disabledBtn]}
          disabled={loading}
        >
          <Text style={styles.btnText}>Add</Text>
        </TouchableOpacity>
      </View>

      {members.length > 0 && (
        <View style={styles.membersContainer}>
          <Text style={styles.membersHeader}>Members ({members.length}):</Text>
          {members.map((email, index) => (
            <View key={index} style={styles.memberRow}>
              <Text style={styles.memberText}>👤 {email}</Text>
              <TouchableOpacity
                onPress={() => removeMember(email)}
                style={styles.removeBtn}
                disabled={loading}
              >
                <Text style={styles.removeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity 
        style={[styles.submitBtn, loading && styles.disabledBtn]} 
        onPress={handleCreateGroup}
        disabled={loading || !groupName.trim() || members.length === 0}
      >
        <Text style={styles.submitText}>
          {loading ? 'Creating...' : 'CREATE GROUP'}
        </Text>
      </TouchableOpacity>

      <Text style={styles.heading}>Your Groups</Text>

      {loading && groups.length === 0 ? (
        <Text style={styles.loadingText}>Loading groups...</Text>
      ) : groups.length === 0 ? (
        <Text style={styles.noGroupText}>No groups yet. Create your first group above!</Text>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(item) => item._id}
          renderItem={renderGroupItem}
          showsVerticalScrollIndicator={false}
          scrollEnabled={false}
        />
      )}

      {/* Bill Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={billModalVisible}
        onRequestClose={() => setBillModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Create New Bill - {selectedGroup?.name}
            </Text>

            <TextInput
              placeholder="Bill Description (e.g., 'Dinner at Italian Restaurant')"
              value={billDescription}
              onChangeText={setBillDescription}
              style={styles.input}
              multiline
              editable={!loading}
            />

            <TextInput
              placeholder="Total Amount (e.g., 120.50)"
              value={billAmount}
              onChangeText={setBillAmount}
              style={styles.input}
              keyboardType="numeric"
              editable={!loading}
            />

            <Text style={styles.splitInfo}>
              {selectedGroup?.members?.length && billAmount ?
                `Split among ${selectedGroup.members.length} members: $${(parseFloat(billAmount) / selectedGroup.members.length).toFixed(2)} each`
                : 'Enter amount to see split calculation'}
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#6c757d' }]}
                onPress={() => setBillModalVisible(false)}
                disabled={loading}
              >
                <Text style={styles.modalBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: COLORS.primary }, loading && styles.disabledBtn]}
                onPress={handleCreateBill}
                disabled={loading || !billDescription.trim() || !billAmount.trim()}
              >
                <Text style={styles.modalBtnText}>
                  {loading ? 'Creating...' : 'Create Bill'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Payment Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={paymentModalVisible}
        onRequestClose={() => setPaymentModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {selectedGroup?.name} - Bills
            </Text>

            {selectedGroup?.bills?.length === 0 ? (
              <Text style={styles.noBillsText}>No bills in this group yet.</Text>
            ) : (
              <>
                <View style={styles.bulkActions}>
                  <TouchableOpacity
                    style={[styles.bulkActionBtn, { backgroundColor: '#ffc107' }]}
                    onPress={sendBulkReminders}
                    disabled={loading}
                  >
                    <Text style={styles.bulkActionText}>
                      {loading ? 'Sending...' : 'Send All Reminders'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <FlatList
                  data={selectedGroup?.bills || []}
                  keyExtractor={(item) => item._id}
                  renderItem={renderBillItem}
                  showsVerticalScrollIndicator={false}
                  style={styles.billsList}
                />
              </>
            )}

            <TouchableOpacity
              style={[styles.modalBtn, { backgroundColor: '#6c757d', marginTop: 10 }]}
              onPress={() => setPaymentModalVisible(false)}
            >
              <Text style={styles.modalBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6f7fc',
    padding: 20,
  },
  heading: {
    fontSize: 22,
    fontWeight: 'bold',
    marginVertical: 15,
    color: '#333',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addBtn: {
    backgroundColor: COLORS.primary,
    padding: 12,
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  btnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  membersContainer: {
    marginVertical: 10,
  },
  membersHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  memberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 10,
    marginBottom: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  memberText: {
    color: '#333',
    fontSize: 16,
  },
  removeBtn: {
    backgroundColor: '#dc3545',
    padding: 6,
    borderRadius: 4,
    minWidth: 24,
    alignItems: 'center',
  },
  removeBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  submitBtn: {
    marginTop: 15,
    backgroundColor: COLORS.primary,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  disabledBtn: {
    opacity: 0.5,
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    textAlign: 'center',
    fontSize: 16,
  },
  noGroupText: {
    marginTop: 10,
    color: '#666',
    textAlign: 'center',
    fontSize: 16,
  },
  groupItem: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  groupName: {
    fontWeight: 'bold',
    fontSize: 18,
    color: '#333',
    marginBottom: 4,
  },
  memberCount: {
    color: '#666',
    fontSize: 14,
    marginBottom: 2,
  },
  billCount: {
    color: '#666',
    fontSize: 14,
    marginBottom: 2,
  },
  totalAmount: {
    color: '#28a745',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  pendingPayments: {
    color: '#dc3545',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  groupActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  actionBtn: {
    padding: 10,
    borderRadius: 6,
    flex: 0.48,
    alignItems: 'center',
  },
  actionBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  splitInfo: {
    color: '#666',
    textAlign: 'center',
    marginBottom: 15,
    fontStyle: 'italic',
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 6,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  modalBtn: {
    padding: 12,
    borderRadius: 8,
    flex: 0.48,
    alignItems: 'center',
  },
  modalBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  bulkActions: {
    marginBottom: 15,
  },
  bulkActionBtn: {
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  bulkActionText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  billsList: {
    maxHeight: 400,
  },
  noBillsText: {
    textAlign: 'center',
    color: '#666',
    marginVertical: 20,
  },
  billItem: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  billItemPaid: {
    borderLeftColor: '#28a745',
    backgroundColor: '#f8fff8',
  },
  billHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  billDescription: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  billStatus: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
  },
  billAmount: {
    fontSize: 14,
    color: '#333',
    marginBottom: 2,
  },
  splitAmount: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  billDate: {
    fontSize: 12,
    color: '#999',
    marginBottom: 10,
  },
  paymentsContainer: {
    marginTop: 10,
  },
  paymentsHeader: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 5,
  },
  memberEmail: {
    flex: 1,
    fontSize: 14,
  },
  paymentStatus: {
    fontSize: 12,
    fontWeight: 'bold',
    marginRight: 5,
  },
  paymentAmount: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 5,
  },
  paymentActions: {
    flexDirection: 'row',
  },
  smallBtn: {
    padding: 6,
    borderRadius: 4,
    marginLeft: 5,
  },
  smallBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});